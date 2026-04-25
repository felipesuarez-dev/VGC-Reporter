use crate::adapters::sprite_resolver::{
    canonical_display_name, fallback_sprite_url, primary_sprite_url,
};
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
use futures::future::join_all;
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
            .list_tournaments_by_format(format, limit.saturating_mul(3))
            .await?;

        let fetches = raw
            .iter()
            .map(|t| self.limitless.get_standings(&t.id))
            .collect::<Vec<_>>();
        let results = join_all(fetches).await;

        let mut kept: Vec<ChampionsTournament> = Vec::with_capacity(raw.len());
        for (t, res) in raw.into_iter().zip(results) {
            let (has_any, champion_name) = match res {
                Ok(standings) => {
                    let champ = extract_champion_name(&standings);
                    (has_any_decklist(&standings), champ)
                }
                Err(e) => {
                    tracing::warn!("standings fetch failed for {}: {}", t.id, e);
                    (false, None)
                }
            };
            if has_any {
                kept.push(into_tournament(t, champion_name));
                if kept.len() >= limit {
                    break;
                }
            }
        }

        Ok(ChampionsReport {
            tournaments: kept,
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
            .map(|raw| canonical_display_name(&raw))
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

fn has_any_decklist(standings: &[LimitlessStanding]) -> bool {
    standings
        .iter()
        .any(|s| s.decklist.as_ref().map(|d| !d.is_empty()).unwrap_or(false))
}

fn into_tournament(
    t: LimitlessTournamentSummary,
    champion_name: Option<String>,
) -> ChampionsTournament {
    ChampionsTournament {
        id: t.id,
        name: t.name,
        date: t.date,
        players: t.players,
        format: t.format,
        organizer_id: t.organizer_id,
        champion_name,
    }
}

fn extract_champion_name(standings: &[LimitlessStanding]) -> Option<String> {
    standings
        .iter()
        .find(|s| s.placing == Some(1))
        .or_else(|| standings.first())
        .and_then(|s| s.name.clone())
        .map(|n| n.trim().to_string())
        .filter(|n| !n.is_empty())
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
    let raw = decklist_display_name(&e)?;
    let display = canonical_display_name(&raw);
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

    fn standing_with(decklist: Option<Vec<LimitlessDecklistEntry>>) -> LimitlessStanding {
        LimitlessStanding {
            placing: Some(1),
            name: Some("x".into()),
            player: None,
            country: None,
            decklist,
            record: None,
            drop: None,
        }
    }

    fn dummy_entry() -> LimitlessDecklistEntry {
        LimitlessDecklistEntry {
            id: Some("incineroar".into()),
            name: Some("Incineroar".into()),
            species: None,
            pokemon: None,
            item: None,
            ability: None,
            tera: None,
            tera_type: None,
            moves: None,
            nature: None,
        }
    }

    #[test]
    fn has_any_decklist_empty_vec() {
        assert!(!has_any_decklist(&[]));
    }

    #[test]
    fn has_any_decklist_none_field() {
        let s = [standing_with(None)];
        assert!(!has_any_decklist(&s));
    }

    #[test]
    fn has_any_decklist_empty_inner() {
        let s = [standing_with(Some(vec![]))];
        assert!(!has_any_decklist(&s));
    }

    #[test]
    fn has_any_decklist_populated() {
        let s = [
            standing_with(None),
            standing_with(Some(vec![dummy_entry()])),
        ];
        assert!(has_any_decklist(&s));
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
