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
        let mut builder = Client::builder()
            .user_agent(config::APP_USER_AGENT)
            .timeout(Duration::from_secs(config::HTTP_TIMEOUT_SECS))
            .gzip(true);

        // labmaus.net serves a Sectigo DV cert but its server does NOT send the
        // issuing intermediate ("Sectigo Public Server Authentication CA DV
        // R36"). Browsers and curl (Windows schannel) silently AIA-fetch the
        // missing intermediate, but rustls does not — so every labmaus request
        // failed with `InvalidCertificate(UnknownIssuer)`, which is why
        // trending / top-teams / meta silently fell back to thin sources and
        // showed "no data". We bundle the intermediate and register it as a
        // trust anchor so the chain validates on every platform (incl. Android,
        // where switching to native-tls/openssl is not viable). Redundant once
        // labmaus fixes its chain; the bundled cert is valid until 2036.
        if let Ok(cert) =
            reqwest::Certificate::from_pem(include_bytes!("../../certs/sectigo-r36.pem"))
        {
            builder = builder.add_root_certificate(cert);
        }

        let inner = builder.build().map_err(AppError::from)?;
        Ok(Self { inner, cache })
    }

    /// GET with SQLite cache. If `ttl_seconds` is 0, always fetch fresh.
    pub async fn get_cached(&self, url: &str, ttl_seconds: i64) -> Result<Vec<u8>, AppError> {
        self.get_cached_with_headers(url, &[], ttl_seconds).await
    }

    /// GET with SQLite cache and per-request headers. Needed for hosts that
    /// gate requests on Origin/Referer (labmaus). Headers are scoped to this
    /// call only so they never leak into requests to other hosts.
    pub async fn get_cached_with_headers(
        &self,
        url: &str,
        headers: &[(&str, &str)],
        ttl_seconds: i64,
    ) -> Result<Vec<u8>, AppError> {
        if ttl_seconds > 0 {
            if let Some(bytes) = self.cache.get(url)? {
                tracing::debug!(url, "cache hit");
                return Ok(bytes);
            }
        }
        tracing::debug!(url, "cache miss, fetching");
        let mut req = self.inner.get(url);
        for (k, v) in headers {
            req = req.header(*k, *v);
        }
        let resp = req.send().await?;
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
