use crate::adapters::sprite_resolver::{fallback_sprite_url, primary_sprite_url};
use crate::adapters::{
    LimitlessClient, LimitlessDecklistEntry, LimitlessStanding, LimitlessTournamentSummary,
};
use crate::domain::champions::{
    ChampionsReport, ChampionsTournament, DecklistPokemon, TournamentStanding,
};
use crate::domain::format::Format;
use crate::error::AppError;
use crate::services::pokedex_service::PokedexService;
use chrono::Utc;
use std::collections::HashMap;
use std::sync::Arc;

type SpriteMap = HashMap<String, (String, Option<String>, Option<String>)>;

#[derive(Clone)]
pub struct ChampionsReportService {
    limitless: LimitlessClient,
    pokedex: Arc<PokedexService>,
}

impl ChampionsReportService {
    pub fn new(limitless: LimitlessClient, pokedex: Arc<PokedexService>) -> Self {
        Self { limitless, pokedex }
    }

    pub async fn list_recent(
        &self,
        format: Format,
        limit: usize,
    ) -> Result<ChampionsReport, AppError> {
        let raw = self
            .limitless
            .list_tournaments_by_format(format, limit)
            .await?;
        Ok(ChampionsReport {
            tournaments: raw.into_iter().map(into_tournament).collect(),
            fetched_at: Utc::now(),
        })
    }

    pub async fn get_standings(
        &self,
        tournament_id: &str,
    ) -> Result<Vec<TournamentStanding>, AppError> {
        let raw = self.limitless.get_standings(tournament_id).await?;
        let sprites = self.resolve_sprites(&raw).await;
        Ok(raw
            .into_iter()
            .map(|s| into_standing(s, &sprites))
            .collect())
    }

    /// Batch sprite resolution: every unique decklist display name across the
    /// full set of standings is resolved once via Pokédex. Keeps the sync
    /// `into_standing` testable without a live PokedexService while still
    /// inheriting pokedex URLs (Calyrex-Ice-Rider etc.) in production.
    async fn resolve_sprites(&self, standings: &[LimitlessStanding]) -> SpriteMap {
        let mut names: Vec<String> = standings
            .iter()
            .filter_map(|s| s.decklist.as_ref())
            .flat_map(|deck| deck.iter().filter_map(decklist_display_name))
            .collect();
        names.sort();
        names.dedup();
        let mut out: SpriteMap = HashMap::with_capacity(names.len());
        for name in names {
            let urls = self.pokedex.sprite_urls_for(&name).await;
            out.insert(name, urls);
        }
        out
    }
}

fn into_tournament(t: LimitlessTournamentSummary) -> ChampionsTournament {
    ChampionsTournament {
        id: t.id,
        name: t.name,
        date: t.date,
        players: t.players,
        format: t.format,
        organizer_id: t.organizer_id,
    }
}

fn decklist_display_name(e: &LimitlessDecklistEntry) -> Option<String> {
    e.species
        .clone()
        .or_else(|| e.pokemon.clone())
        .or_else(|| e.name.clone())
        .or_else(|| e.id.clone())
}

pub fn into_standing(s: LimitlessStanding, sprites: &SpriteMap) -> TournamentStanding {
    let (record_str, wins, losses, ties) = match s.record.as_ref() {
        Some(r) => (Some(r.display()), r.wins(), r.losses(), r.ties()),
        None => (None, 0, 0, 0),
    };
    TournamentStanding {
        placing: s.placing,
        player_name: s.name,
        player_id: s.player,
        country: s.country,
        record: record_str,
        wins,
        losses,
        ties,
        decklist: s
            .decklist
            .unwrap_or_default()
            .into_iter()
            .filter_map(|e| into_decklist_pokemon(e, sprites))
            .collect(),
    }
}

fn into_decklist_pokemon(
    e: LimitlessDecklistEntry,
    sprites: &SpriteMap,
) -> Option<DecklistPokemon> {
    let display = decklist_display_name(&e)?;
    let (sprite_url, sprite_fallback_url, home_sprite_url) =
        sprites.get(&display).cloned().unwrap_or_else(|| {
            (
                primary_sprite_url(&display),
                fallback_sprite_url(&display),
                None,
            )
        });
    Some(DecklistPokemon {
        sprite_url,
        sprite_fallback_url,
        home_sprite_url,
        id: e.id,
        name: display,
        item: e.item,
        ability: e.ability,
        tera_type: e.tera.or(e.tera_type),
        moves: e.moves.unwrap_or_default(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::adapters::limitless_client::{LimitlessRecord, LimitlessRecordParts};

    #[test]
    fn into_standing_maps_record_parts() {
        let raw = LimitlessStanding {
            placing: Some(1),
            name: Some("Alice".into()),
            player: Some("alice".into()),
            country: Some("US".into()),
            decklist: Some(vec![LimitlessDecklistEntry {
                id: Some("incineroar".into()),
                name: Some("Incineroar".into()),
                species: None,
                pokemon: None,
                item: Some("Safety Goggles".into()),
                ability: Some("Intimidate".into()),
                tera: Some("Ghost".into()),
                tera_type: None,
                moves: Some(vec!["Fake Out".into()]),
                nature: None,
            }]),
            record: Some(LimitlessRecord::Parts(LimitlessRecordParts {
                wins: 8,
                losses: 1,
                ties: 0,
            })),
            drop: None,
        };
        // Empty sprite map exercises the heuristic fallback — same behaviour
        // for species that aren't in the pokedex (or when pokedex fetch fails).
        let s = into_standing(raw, &SpriteMap::new());
        assert_eq!(s.placing, Some(1));
        assert_eq!(s.country.as_deref(), Some("US"));
        assert_eq!(s.record.as_deref(), Some("8-1-0"));
        assert_eq!(s.wins, 8);
        assert_eq!(s.decklist.len(), 1);
        assert_eq!(s.decklist[0].name, "Incineroar");
        assert_eq!(s.decklist[0].tera_type.as_deref(), Some("Ghost"));
        assert!(s.decklist[0].sprite_url.contains("incineroar"));
        assert!(s.decklist[0].home_sprite_url.is_none());
    }

    #[test]
    fn sprite_map_injection_overrides_heuristic() {
        let raw = LimitlessStanding {
            placing: Some(2),
            name: Some("Bob".into()),
            player: Some("bob".into()),
            country: Some("JP".into()),
            decklist: Some(vec![LimitlessDecklistEntry {
                id: Some("calyrex-shadow".into()),
                name: Some("Calyrex-Shadow".into()),
                species: None,
                pokemon: None,
                item: None,
                ability: None,
                tera: None,
                tera_type: None,
                moves: None,
                nature: None,
            }]),
            record: None,
            drop: None,
        };
        let mut sprites = SpriteMap::new();
        sprites.insert(
            "Calyrex-Shadow".into(),
            (
                "https://example/primary.png".into(),
                Some("https://example/dex.png".into()),
                Some("https://example/home.png".into()),
            ),
        );
        let s = into_standing(raw, &sprites);
        assert_eq!(s.decklist[0].sprite_url, "https://example/primary.png");
        assert_eq!(
            s.decklist[0].home_sprite_url.as_deref(),
            Some("https://example/home.png")
        );
    }
}
