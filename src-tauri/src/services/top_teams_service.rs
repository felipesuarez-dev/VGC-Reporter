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
    pub record: Option<String>,
    pub members: Vec<TopTeamMember>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct TopTeamMember {
    pub species: String,
    pub sprite_url: String,
    pub item: Option<String>,
    pub tera_type: Option<String>,
}

impl TopTeamsService {
    pub fn new(limitless: LimitlessClient, cache: Arc<CacheRepo>) -> Self {
        Self { limitless, cache }
    }

    pub async fn get_top_teams(&self, format: Format, limit: usize) -> Result<Vec<TopTeam>, AppError> {
        let key = format!("top-teams::{}::{}", format.cache_id(), limit);
        if let Some(bytes) = self.cache.get(&key)? {
            if let Ok(list) = serde_json::from_slice::<Vec<TopTeam>>(&bytes) {
                return Ok(list);
            }
        }
        let tournaments = self
            .limitless
            .list_tournaments(format, 10)
            .await
            .unwrap_or_default();
        let mut out = Vec::new();
        for t in tournaments {
            let standings = self.limitless.get_standings(&t.id).await.unwrap_or_default();
            for s in standings.into_iter().take(8) {
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

        let bytes = serde_json::to_vec(&out)?;
        self.cache.put(&key, &bytes, config::TTL_META_SNAPSHOT)?;
        Ok(out)
    }
}
