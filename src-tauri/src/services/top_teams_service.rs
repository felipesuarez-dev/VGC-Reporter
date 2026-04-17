use crate::adapters::sprite_resolver::{canonical_id, sprite_url};
use crate::adapters::LimitlessClient;
use crate::config;
use crate::domain::format::Format;
use crate::error::AppError;
use crate::storage::CacheRepo;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use ts_rs::TS;

#[derive(Clone)]
pub struct TopTeamsService {
    limitless: LimitlessClient,
    cache: Arc<CacheRepo>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct TopTeam {
    pub tournament: String,
    pub placing: Option<u32>,
    pub player: Option<String>,
    #[serde(default)]
    pub country: Option<String>,
    pub record: Option<String>,
    pub members: Vec<TopTeamMember>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct TopTeamsMeta {
    pub tournaments_analyzed: u32,
    pub battles_analyzed: u32,
    pub source: String,
    #[serde(default)]
    pub from_date: Option<String>,
    #[serde(default)]
    pub to_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct TopTeamsReport {
    pub teams: Vec<TopTeam>,
    pub meta: TopTeamsMeta,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct TopTeamMember {
    pub species: String,
    pub sprite_url: String,
    pub item: Option<String>,
    pub tera_type: Option<String>,
    #[serde(default)]
    pub ability: Option<String>,
    #[serde(default)]
    pub nature: Option<String>,
    #[serde(default)]
    pub moves: Vec<String>,
}

impl TopTeamsService {
    pub fn new(limitless: LimitlessClient, cache: Arc<CacheRepo>) -> Self {
        Self { limitless, cache }
    }

    pub async fn get_top_teams_report(
        &self,
        format: Format,
        limit: usize,
    ) -> Result<TopTeamsReport, AppError> {
        let key = format!("top-teams::v3::{}::{}", format.cache_id(), limit);
        if let Some(bytes) = self.cache.get(&key)? {
            if let Ok(report) = serde_json::from_slice::<TopTeamsReport>(&bytes) {
                return Ok(report);
            }
        }
        let tournaments = self
            .limitless
            .list_tournaments(format, 10)
            .await
            .unwrap_or_default();
        let tournaments_analyzed = tournaments.len() as u32;
        let mut dates: Vec<String> = tournaments.iter().filter_map(|t| t.date.clone()).collect();
        dates.sort();
        let from_date = dates.first().cloned();
        let to_date = dates.last().cloned();

        let mut out = Vec::new();
        let mut battles_analyzed: u32 = 0;
        for t in tournaments {
            let standings = self
                .limitless
                .get_standings(&t.id)
                .await
                .unwrap_or_default();
            for s in standings.into_iter().take(8) {
                battles_analyzed += 1;
                let Some(deck) = s.decklist else { continue };
                if deck.is_empty() {
                    continue;
                }
                let members = deck
                    .into_iter()
                    .filter_map(|e| {
                        let species = e.species_name()?.to_string();
                        Some(TopTeamMember {
                            sprite_url: sprite_url(&canonical_id(&species)),
                            species,
                            item: e.item.clone(),
                            tera_type: e.tera_value().map(|v| v.to_string()),
                            ability: e.ability.clone(),
                            nature: e.nature.clone(),
                            moves: e.moves.clone().unwrap_or_default(),
                        })
                    })
                    .collect::<Vec<_>>();
                if members.len() < 3 {
                    continue;
                }
                out.push(TopTeam {
                    tournament: t.name.clone(),
                    placing: s.placing,
                    player: s.name.clone(),
                    country: s.country.clone(),
                    record: s.record.as_ref().map(|r| r.display()),
                    members,
                });
                if out.len() >= limit {
                    break;
                }
            }
            if out.len() >= limit {
                break;
            }
        }

        let report = TopTeamsReport {
            teams: out,
            meta: TopTeamsMeta {
                tournaments_analyzed,
                battles_analyzed,
                source: "Limitless VGC".into(),
                from_date,
                to_date,
            },
        };

        let bytes = serde_json::to_vec(&report)?;
        self.cache.put(&key, &bytes, config::TTL_META_SNAPSHOT)?;
        Ok(report)
    }
}
