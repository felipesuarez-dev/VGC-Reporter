use crate::config;
use crate::error::AppError;
use crate::storage::CacheRepo;
use reqwest::Client;
use std::sync::Arc;
use std::time::Duration;

/// Shared HTTP client with a SQLite-backed cache (used by all remote adapters).
#[derive(Clone)]
pub struct HttpClient {
    inner: Client,
    cache: Arc<CacheRepo>,
}

impl HttpClient {
    pub fn new(cache: Arc<CacheRepo>) -> Result<Self, AppError> {
        let inner = Client::builder()
            .user_agent(config::APP_USER_AGENT)
            .timeout(Duration::from_secs(config::HTTP_TIMEOUT_SECS))
            .gzip(true)
            .build()
            .map_err(AppError::from)?;
        Ok(Self { inner, cache })
    }

    /// GET with SQLite cache. If `ttl_seconds` is 0, always fetch fresh.
    pub async fn get_cached(&self, url: &str, ttl_seconds: i64) -> Result<Vec<u8>, AppError> {
        if ttl_seconds > 0 {
            if let Some(bytes) = self.cache.get(url)? {
                tracing::debug!(url, "cache hit");
                return Ok(bytes);
            }
        }
        tracing::debug!(url, "cache miss, fetching");
        let resp = self.inner.get(url).send().await?;
        if !resp.status().is_success() {
            return Err(AppError::Http(format!(
                "{} returned status {}",
                url,
                resp.status()
            )));
        }
        let bytes = resp.bytes().await?.to_vec();
        if ttl_seconds > 0 {
            self.cache.put(url, &bytes, ttl_seconds)?;
        }
        Ok(bytes)
    }

    pub async fn get_json<T: serde::de::DeserializeOwned>(
        &self,
        url: &str,
        ttl_seconds: i64,
    ) -> Result<T, AppError> {
        let bytes = self.get_cached(url, ttl_seconds).await?;
        let value = serde_json::from_slice::<T>(&bytes)?;
        Ok(value)
    }
}
