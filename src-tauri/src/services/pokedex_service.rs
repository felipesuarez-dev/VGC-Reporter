use crate::adapters::showdown_client::EntityDescriptions;
use crate::adapters::ShowdownClient;
use crate::config;
use crate::domain::move_::MoveSummary;
use crate::domain::pokemon::{Pokemon, PokemonType};
use crate::error::AppError;
use crate::storage::CacheRepo;
use std::collections::HashMap;
use std::sync::Arc;

fn canonical_species_id(s: &str) -> String {
    s.chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .map(|c| c.to_ascii_lowercase())
        .collect()
}

#[derive(Clone)]
pub struct PokedexService {
    showdown: ShowdownClient,
    cache: Arc<CacheRepo>,
}

impl PokedexService {
    pub fn new(showdown: ShowdownClient, cache: Arc<CacheRepo>) -> Self {
        Self { showdown, cache }
    }

    pub async fn all(&self) -> Result<Vec<Pokemon>, AppError> {
        // v2 bumps the cache key after the forme-aware parser landed; older
        // caches stored entries without formes and with num=0 for cosmetics.
        const KEY: &str = "pokedex::all::v2";
        if let Some(bytes) = self.cache.get(KEY)? {
            if let Ok(list) = serde_json::from_slice::<Vec<Pokemon>>(&bytes) {
                return Ok(list);
            }
        }
        let pokedex = self.showdown.fetch_pokedex().await?;
        let list = pokedex.pokemon;
        let bytes = serde_json::to_vec(&list)?;
        self.cache.put(KEY, &bytes, config::TTL_SHOWDOWN_DATA)?;
        Ok(list)
    }

    pub async fn search(
        &self,
        query: Option<&str>,
        type_filter: Option<PokemonType>,
    ) -> Result<Vec<Pokemon>, AppError> {
        let all = self.all().await?;
        let q = query.map(|q| q.to_lowercase());
        let filtered = all
            .into_iter()
            .filter(|p| {
                let q_ok = q
                    .as_ref()
                    .map(|qq| p.name.to_lowercase().contains(qq) || p.id.contains(qq))
                    .unwrap_or(true);
                let t_ok = type_filter
                    .as_ref()
                    .map(|t| p.types.contains(t))
                    .unwrap_or(true);
                q_ok && t_ok
            })
            .collect();
        Ok(filtered)
    }

    pub async fn get(&self, id: &str) -> Result<Option<Pokemon>, AppError> {
        let all = self.all().await?;
        Ok(all.into_iter().find(|p| p.id == id))
    }

    pub async fn list_items(&self) -> Result<Vec<String>, AppError> {
        // v2 bumps the cache key after items migrated from items.json to
        // items.js; older caches were empty lists from the failed parse.
        const KEY: &str = "showdown::items::v2";
        if let Some(bytes) = self.cache.get(KEY)? {
            if let Ok(list) = serde_json::from_slice::<Vec<String>>(&bytes) {
                return Ok(list);
            }
        }
        let list = self.showdown.fetch_items().await?;
        let bytes = serde_json::to_vec(&list)?;
        self.cache.put(KEY, &bytes, config::TTL_SHOWDOWN_DATA)?;
        Ok(list)
    }

    pub async fn list_moves(&self) -> Result<Vec<String>, AppError> {
        const KEY: &str = "showdown::moves";
        if let Some(bytes) = self.cache.get(KEY)? {
            if let Ok(list) = serde_json::from_slice::<Vec<String>>(&bytes) {
                return Ok(list);
            }
        }
        let list = self.showdown.fetch_moves().await?;
        let bytes = serde_json::to_vec(&list)?;
        self.cache.put(KEY, &bytes, config::TTL_SHOWDOWN_DATA)?;
        Ok(list)
    }

    async fn move_details(&self) -> Result<HashMap<String, MoveSummary>, AppError> {
        const KEY: &str = "showdown::move_details";
        if let Some(bytes) = self.cache.get(KEY)? {
            if let Ok(map) = serde_json::from_slice::<HashMap<String, MoveSummary>>(&bytes) {
                return Ok(map);
            }
        }
        let map = self.showdown.fetch_move_details().await?;
        let bytes = serde_json::to_vec(&map)?;
        self.cache.put(KEY, &bytes, config::TTL_SHOWDOWN_DATA)?;
        Ok(map)
    }

    async fn learnsets(&self) -> Result<HashMap<String, Vec<String>>, AppError> {
        const KEY: &str = "showdown::learnsets";
        if let Some(bytes) = self.cache.get(KEY)? {
            if let Ok(map) = serde_json::from_slice::<HashMap<String, Vec<String>>>(&bytes) {
                return Ok(map);
            }
        }
        let map = self.showdown.fetch_learnsets().await?;
        let bytes = serde_json::to_vec(&map)?;
        self.cache.put(KEY, &bytes, config::TTL_SHOWDOWN_DATA)?;
        Ok(map)
    }

    pub async fn get_entity_descriptions(&self) -> Result<EntityDescriptions, AppError> {
        const KEY: &str = "showdown::entity_descriptions::v1";
        if let Some(bytes) = self.cache.get(KEY)? {
            if let Ok(data) = serde_json::from_slice::<EntityDescriptions>(&bytes) {
                return Ok(data);
            }
        }
        let data = self.showdown.fetch_entity_descriptions().await?;
        let bytes = serde_json::to_vec(&data)?;
        self.cache.put(KEY, &bytes, config::TTL_SHOWDOWN_DATA)?;
        Ok(data)
    }

    pub async fn list_moves_for_species(
        &self,
        species: &str,
    ) -> Result<Vec<MoveSummary>, AppError> {
        let details = self.move_details().await?;
        let learnsets = self.learnsets().await?;
        let id = canonical_species_id(species);
        let Some(move_ids) = learnsets.get(&id) else {
            return Ok(Vec::new());
        };
        let mut out: Vec<MoveSummary> = move_ids
            .iter()
            .filter_map(|mid| details.get(mid).cloned())
            .collect();
        out.sort_by(|a, b| a.name.cmp(&b.name));
        out.dedup_by(|a, b| a.id == b.id);
        Ok(out)
    }
}
