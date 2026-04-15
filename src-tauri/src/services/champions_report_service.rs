use crate::adapters::sprite_resolver::{fallback_sprite_url, primary_sprite_url};
use crate::adapters::{
    LimitlessClient, LimitlessDecklistEntry, LimitlessStanding, LimitlessTournamentSummary,
};
use crate::domain::champions::{
    ChampionsReport, ChampionsTournament, DecklistPokemon, TournamentStanding,
};
use crate::domain::format::Format;
use crate::error::AppError;
use chrono::Utc;

#[derive(Clone)]
pub struct ChampionsReportService {
    limitless: LimitlessClient,
}

impl ChampionsReportService {
    pub fn new(limitless: LimitlessClient) -> Self {
        Self { limitless }
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
        Ok(raw.into_iter().map(into_standing).collect())
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

pub fn into_standing(s: LimitlessStanding) -> TournamentStanding {
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
            .filter_map(into_decklist_pokemon)
            .collect(),
    }
}

fn into_decklist_pokemon(e: LimitlessDecklistEntry) -> Option<DecklistPokemon> {
    let display = e
        .species
        .clone()
        .or_else(|| e.pokemon.clone())
        .or_else(|| e.name.clone())
        .or_else(|| e.id.clone())?;
    Some(DecklistPokemon {
        sprite_url: primary_sprite_url(&display),
        sprite_fallback_url: fallback_sprite_url(&display),
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
        let s = into_standing(raw);
        assert_eq!(s.placing, Some(1));
        assert_eq!(s.country.as_deref(), Some("US"));
        assert_eq!(s.record.as_deref(), Some("8-1-0"));
        assert_eq!(s.wins, 8);
        assert_eq!(s.decklist.len(), 1);
        assert_eq!(s.decklist[0].name, "Incineroar");
        assert_eq!(s.decklist[0].tera_type.as_deref(), Some("Ghost"));
        assert!(s.decklist[0].sprite_url.contains("incineroar"));
    }
}
