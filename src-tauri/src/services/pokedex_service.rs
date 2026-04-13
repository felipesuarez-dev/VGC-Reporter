use crate::adapters::ShowdownClient;
use crate::config;
use crate::domain::pokemon::{Pokemon, PokemonType};
use crate::error::AppError;
use crate::storage::CacheRepo;
use std::sync::Arc;

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
        const KEY: &str = "pokedex::all";
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
        const KEY: &str = "showdown::items";
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
}
