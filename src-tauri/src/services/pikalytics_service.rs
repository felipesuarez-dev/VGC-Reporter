use crate::adapters::PikalyticsClient;
use crate::domain::pikalytics::PikalyticsEntry;
use crate::error::AppError;
use crate::storage::CacheRepo;
use std::sync::Arc;

#[derive(Clone)]
pub struct PikalyticsService {
    client: PikalyticsClient,
    cache: Arc<CacheRepo>,
}

impl PikalyticsService {
    pub fn new(client: PikalyticsClient, cache: Arc<CacheRepo>) -> Self {
        Self { client, cache }
    }

    pub async fn get_entry(&self, species: &str, lang: &str) -> Result<PikalyticsEntry, AppError> {
        let key = format!("pikalytics::{lang}::{species}");
        if let Some(bytes) = self.cache.get(&key)? {
            if let Ok(entry) = serde_json::from_slice::<PikalyticsEntry>(&bytes) {
                return Ok(entry);
            }
        }
        let entry = self.client.fetch_entry(species, lang).await?;
        if let Ok(bytes) = serde_json::to_vec(&entry) {
            let _ = self.cache.put(&key, &bytes, crate::config::TTL_PIKALYTICS);
        }
        Ok(entry)
    }
}
