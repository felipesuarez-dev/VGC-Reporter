use crate::adapters::HttpClient;
use crate::domain::updater::UpdateInfo;
use crate::error::AppError;
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::Arc;

const LATEST_JSON_URL: &str =
    "https://github.com/felipesuarez-dev/VGC-Reporter/releases/latest/download/latest.json";

#[derive(Debug, Deserialize)]
struct LatestPlatform {
    #[serde(default)]
    url: String,
}

#[derive(Debug, Deserialize)]
struct LatestJson {
    version: String,
    #[serde(default)]
    notes: Option<String>,
    #[serde(default)]
    platforms: HashMap<String, LatestPlatform>,
}

#[derive(Clone)]
pub struct UpdaterService {
    http: Arc<HttpClient>,
}

impl UpdaterService {
    pub fn new(http: Arc<HttpClient>) -> Self {
        Self { http }
    }

    /// Fetches `latest.json` from the GitHub release endpoint and compares
    /// against the locally bundled crate version. Returns `None` when the
    /// remote is the same or older than local; otherwise yields an
    /// `UpdateInfo` with the platform-specific download URL when available.
    pub async fn check(&self) -> Result<Option<UpdateInfo>, AppError> {
        let latest: LatestJson = self.http.get_json(LATEST_JSON_URL, 0).await?;
        let local = env!("CARGO_PKG_VERSION");
        if !is_newer(&latest.version, local) {
            return Ok(None);
        }
        let android_url = latest
            .platforms
            .iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("android"))
            .map(|(_, v)| v.url.clone())
            .filter(|u| !u.is_empty());
        Ok(Some(UpdateInfo {
            version: latest.version,
            current_version: local.to_string(),
            notes: latest.notes.unwrap_or_default(),
            android_url,
        }))
    }
}

fn parse_semver(v: &str) -> (u32, u32, u32) {
    let trimmed = v.trim().trim_start_matches('v');
    let mut iter = trimmed.split(|c: char| c == '.' || c == '-');
    let major = iter.next().and_then(|s| s.parse().ok()).unwrap_or(0);
    let minor = iter.next().and_then(|s| s.parse().ok()).unwrap_or(0);
    let patch = iter.next().and_then(|s| s.parse().ok()).unwrap_or(0);
    (major, minor, patch)
}

fn is_newer(remote: &str, local: &str) -> bool {
    parse_semver(remote) > parse_semver(local)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn newer_minor() {
        assert!(is_newer("0.1.12", "0.1.10"));
    }

    #[test]
    fn equal_is_not_newer() {
        assert!(!is_newer("0.1.10", "0.1.10"));
    }

    #[test]
    fn older_is_not_newer() {
        assert!(!is_newer("0.1.9", "0.1.10"));
    }

    #[test]
    fn ignores_v_prefix_and_suffix() {
        assert!(is_newer("v0.1.12.20260425-beta", "0.1.10"));
        assert!(is_newer("0.2.0", "0.1.99"));
    }

    #[test]
    fn major_dominates() {
        assert!(is_newer("1.0.0", "0.99.99"));
    }
}
