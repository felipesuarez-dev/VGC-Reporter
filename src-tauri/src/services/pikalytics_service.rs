use crate::adapters::PikalyticsClient;
use crate::domain::pikalytics::PikalyticsEntry;
use crate::error::AppError;
use crate::services::PokedexService;
use crate::storage::CacheRepo;
use std::sync::Arc;

#[derive(Clone)]
pub struct PikalyticsService {
    client: PikalyticsClient,
    cache: Arc<CacheRepo>,
    pokedex: Arc<PokedexService>,
}

impl PikalyticsService {
    pub fn new(
        client: PikalyticsClient,
        cache: Arc<CacheRepo>,
        pokedex: Arc<PokedexService>,
    ) -> Self {
        Self {
            client,
            cache,
            pokedex,
        }
    }

    pub async fn get_entry(&self, species: &str, lang: &str) -> Result<PikalyticsEntry, AppError> {
        // v2 bumps the cache key after teammate sprites began being resolved
        // through the Pokedex (so we never serve a cached entry whose
        // teammates have null sprite_url and force the frontend into the
        // legacy slug-stripping fallback).
        let key = format!("pikalytics::v2::{lang}::{species}");
        if let Some(bytes) = self.cache.get(&key)? {
            if let Ok(entry) = serde_json::from_slice::<PikalyticsEntry>(&bytes) {
                return Ok(entry);
            }
        }
        let mut entry = self.client.fetch_entry(species, lang).await?;
        self.enrich_sprites(&mut entry).await;
        if let Ok(bytes) = serde_json::to_vec(&entry) {
            let _ = self.cache.put(&key, &bytes, crate::config::TTL_PIKALYTICS);
        }
        Ok(entry)
    }

    /// Replace the heuristic sprite URLs from the scraper with whatever the
    /// Pokedex serves, so hyphenated formes (Calyrex-Shadow,
    /// Urshifu-Rapid-Strike, Tauros-Paldea-*) get the same canonical CDN
    /// URLs that already work in Pokedex/Top Teams instead of falling back
    /// to a slug-stripped 404.
    async fn enrich_sprites(&self, entry: &mut PikalyticsEntry) {
        let (main, _, _) = self.pokedex.sprite_urls_for(&entry.species_display).await;
        entry.sprite_url = Some(main);
        for tm in entry.common_teammates.iter_mut() {
            let (sprite, _, _) = self.pokedex.sprite_urls_for(&tm.species).await;
            tm.sprite_url = Some(sprite);
        }
    }
}
