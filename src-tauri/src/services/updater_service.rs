use crate::adapters::HttpClient;
use crate::domain::updater::UpdateInfo;
use crate::error::AppError;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio::io::AsyncWriteExt;

const LATEST_JSON_URL: &str =
    "https://github.com/felipesuarez-dev/VGC-Reporter/releases/latest/download/latest.json";

#[derive(Debug, Deserialize)]
struct LatestPlatform {
    #[serde(default)]
    url: String,
    #[serde(default)]
    signature: Option<String>,
    #[serde(default)]
    size: Option<u64>,
    #[serde(default)]
    sha256: Option<String>,
}

#[derive(Debug, Deserialize)]
struct LatestJson {
    version: String,
    #[serde(default)]
    notes: Option<String>,
    #[serde(default)]
    platforms: HashMap<String, LatestPlatform>,
}

impl LatestJson {
    fn platform(&self, keys: &[&str]) -> Option<&LatestPlatform> {
        keys.iter().find_map(|key| {
            self.platforms
                .iter()
                .find(|(name, _)| name.eq_ignore_ascii_case(key))
                .map(|(_, platform)| platform)
        })
    }

    fn android(&self) -> Option<&LatestPlatform> {
        self.platform(&["android"])
    }

    fn desktop(&self) -> Option<&LatestPlatform> {
        self.platform(&["windows-x86_64-msi", "windows-x86_64"])
    }
}

#[derive(Clone)]
pub struct UpdaterService {
    http: Arc<HttpClient>,
    downloads: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>>,
}

impl UpdaterService {
    pub fn new(http: Arc<HttpClient>) -> Self {
        Self {
            http,
            downloads: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Fetches `latest.json` and compares it with the bundled crate version.
    /// The Android fields include size and SHA-256 so the download can be
    /// verified before the installer is launched.
    pub async fn check(&self) -> Result<Option<UpdateInfo>, AppError> {
        let latest: LatestJson = self.http.get_json(LATEST_JSON_URL, 0).await?;
        let local = env!("CARGO_PKG_VERSION");
        if !is_newer(&latest.version, local) {
            return Ok(None);
        }
        let android_url = latest
            .android()
            .map(|platform| platform.url.clone())
            .filter(|url| !url.is_empty());
        let android_size = latest.android().and_then(|platform| platform.size);
        let android_sha256 = latest
            .android()
            .and_then(|platform| platform.sha256.clone());
        let android_signature = latest
            .android()
            .and_then(|platform| platform.signature.clone());
        let desktop_url = latest
            .desktop()
            .map(|platform| platform.url.clone())
            .filter(|url| !url.is_empty());
        let desktop_signature = latest
            .desktop()
            .and_then(|platform| platform.signature.clone());
        Ok(Some(UpdateInfo {
            version: latest.version,
            current_version: local.to_string(),
            notes: latest.notes.unwrap_or_default(),
            android_url,
            android_size,
            android_sha256,
            android_signature,
            desktop_url,
            desktop_signature,
        }))
    }

    pub fn begin_download(&self, request_id: &str) -> Arc<AtomicBool> {
        let cancel = Arc::new(AtomicBool::new(false));
        if let Ok(mut downloads) = self.downloads.lock() {
            downloads.insert(request_id.to_string(), cancel.clone());
        }
        cancel
    }

    pub fn cancel_download(&self, request_id: &str) -> bool {
        if let Ok(downloads) = self.downloads.lock() {
            if let Some(cancel) = downloads.get(request_id) {
                cancel.store(true, Ordering::Relaxed);
                return true;
            }
        }
        false
    }

    fn finish_download(&self, request_id: &str) {
        if let Ok(mut downloads) = self.downloads.lock() {
            downloads.remove(request_id);
        }
    }

    /// Streams the APK to `destination`, reports real byte progress, verifies
    /// size and SHA-256, and only then renames the temporary file. A partial
    /// download never reaches the installer.
    pub async fn download_android_apk(
        &self,
        request_id: &str,
        url: &str,
        destination: &Path,
        expected_size: u64,
        expected_sha256: &str,
        progress: &mut (dyn FnMut(u64, u64) + Send),
    ) -> Result<u64, AppError> {
        if !url.starts_with("https://") {
            return Err(AppError::Validation("the update URL must use HTTPS".into()));
        }
        if expected_size == 0 {
            return Err(AppError::Validation(
                "latest.json does not declare the APK size".into(),
            ));
        }
        if expected_sha256.len() != 64
            || !expected_sha256.bytes().all(|byte| byte.is_ascii_hexdigit())
        {
            return Err(AppError::Validation(
                "latest.json does not declare a valid APK SHA-256".into(),
            ));
        }
        let cancel = self.begin_download(request_id);
        let parent = destination
            .parent()
            .ok_or_else(|| AppError::Validation("update path has no parent".into()))?;
        tokio::fs::create_dir_all(parent).await?;
        let partial = destination.with_extension("apk.part");
        let result = self
            .download_to_partial(
                url,
                &partial,
                expected_size,
                expected_sha256,
                &cancel,
                progress,
            )
            .await;
        self.finish_download(request_id);
        match result {
            Ok(bytes) => {
                tokio::fs::rename(&partial, destination).await?;
                Ok(bytes)
            }
            Err(error) => {
                let _ = tokio::fs::remove_file(&partial).await;
                Err(error)
            }
        }
    }

    async fn download_to_partial(
        &self,
        url: &str,
        partial: &Path,
        expected_size: u64,
        expected_sha256: &str,
        cancel: &AtomicBool,
        progress: &mut (dyn FnMut(u64, u64) + Send),
    ) -> Result<u64, AppError> {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(300))
            .build()
            .map_err(|error| AppError::Http(error.to_string()))?;
        let mut response = client
            .get(url)
            .send()
            .await
            .map_err(|error| AppError::Http(error.to_string()))?;
        if !response.status().is_success() {
            return Err(AppError::Http(format!(
                "update download returned {}",
                response.status()
            )));
        }
        let total = response.content_length().unwrap_or(expected_size);
        if total > 0 && total != expected_size {
            return Err(AppError::Validation(format!(
                "APK size mismatch: manifest says {expected_size}, server says {total}"
            )));
        }
        let mut file = tokio::fs::File::create(partial).await?;
        let mut hasher = Sha256::new();
        let mut downloaded = 0u64;
        let mut last_report = Instant::now() - Duration::from_secs(1);
        while let Some(chunk) = response
            .chunk()
            .await
            .map_err(|error| AppError::Http(error.to_string()))?
        {
            if cancel.load(Ordering::Relaxed) {
                return Err(AppError::Validation("download cancelled".into()));
            }
            file.write_all(&chunk).await?;
            hasher.update(&chunk);
            downloaded += chunk.len() as u64;
            if downloaded > expected_size {
                return Err(AppError::Validation(
                    "APK is larger than the manifest declares".into(),
                ));
            }
            if last_report.elapsed() >= Duration::from_millis(120) {
                progress(downloaded, expected_size);
                last_report = Instant::now();
            }
        }
        file.flush().await?;
        drop(file);
        progress(downloaded, expected_size);
        if downloaded != expected_size {
            return Err(AppError::Validation(format!(
                "APK size mismatch: expected {expected_size}, received {downloaded}"
            )));
        }
        let digest = format!("{:x}", hasher.finalize());
        if !digest.eq_ignore_ascii_case(expected_sha256) {
            return Err(AppError::Validation(
                "APK SHA-256 does not match latest.json".into(),
            ));
        }
        Ok(downloaded)
    }
}

fn parse_semver(v: &str) -> (u32, u32, u32) {
    let trimmed = v.trim().trim_start_matches('v');
    let mut iter = trimmed.split(['.', '-']);
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

    fn latest(json: &str) -> LatestJson {
        serde_json::from_str(json).expect("latest json")
    }

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

    #[test]
    fn reads_android_size_and_hash_from_latest_json() {
        let parsed = latest(
            r#"{
              "version": "0.6.2",
              "platforms": {
                "android": {
                  "url": "https://example/apk",
                  "signature": "sig",
                  "size": 1234,
                  "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
                }
              }
            }"#,
        );
        let android = parsed.android().expect("android platform");
        assert_eq!(android.size, Some(1234));
        assert_eq!(android.sha256, Some("a".repeat(64)));
    }
}
