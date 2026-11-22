use crate::domain::sync::{SyncBundle, SyncImportResult, SyncSession, SYNC_SCHEMA};
use crate::error::AppError;
use crate::state::AppState;
use chrono::{Duration as ChronoDuration, Utc};
use rand::Rng;
use std::net::UdpSocket;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::State;
use tiny_http::{Header, Response, Server};

const SESSION_SECONDS: u64 = 120;
const DISCOVERY_PORT: u16 = 47823;
const DISCOVERY_PROTOCOL: &str = "VGCREP1";

const SETTINGS_WHITELIST: &[&str] = &[
    "language",
    "timezone",
    "home_country",
    "live_stream_urls",
    "official_stream_url",
    "labmaus_name::regulation-m-a",
    "limitless_code::regulation-m-a",
    "smogon_slug::regulation-m-a",
    "labmaus_name::regulation-m-b",
    "limitless_code::regulation-m-b",
    "smogon_slug::regulation-m-b",
    "labmaus_name::regulation-m-c",
    "limitless_code::regulation-m-c",
    "smogon_slug::regulation-m-c",
];

fn code() -> String {
    const ALPHABET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let mut rng = rand::thread_rng();
    (0..8)
        .map(|_| ALPHABET[rng.gen_range(0..ALPHABET.len())] as char)
        .collect()
}

fn token() -> String {
    let mut rng = rand::thread_rng();
    (0..32)
        .map(|_| format!("{:x}", rng.gen_range(0..16)))
        .collect()
}

/// UDP discovery keeps the 8-character code useful without typing a URL on a
/// TV or desktop. The QR remains the primary flow; discovery is the fallback
/// for devices that cannot scan (desktop receiving from a phone).
fn build_probe(code: &str) -> String {
    format!("{DISCOVERY_PROTOCOL} FIND {code}")
}

fn parse_probe(payload: &str) -> Option<&str> {
    payload
        .strip_prefix(DISCOVERY_PROTOCOL)?
        .strip_prefix(" FIND ")
        .map(str::trim)
}

fn build_reply(url: &str) -> String {
    format!("{DISCOVERY_PROTOCOL} URL {url}")
}

fn parse_reply(payload: &str) -> Option<&str> {
    let url = payload
        .strip_prefix(DISCOVERY_PROTOCOL)?
        .strip_prefix(" URL ")?
        .trim();
    if url.starts_with("http://") || url.starts_with("https://") {
        Some(url)
    } else {
        None
    }
}

fn normalize_code(raw: &str) -> Result<String, AppError> {
    let code = raw.trim().to_uppercase();
    if code.len() != 8 || !code.chars().all(|ch| ch.is_ascii_alphanumeric()) {
        return Err(AppError::Validation(
            "the sync code must have 8 letters or digits".into(),
        ));
    }
    Ok(code)
}

/// Broadcast the code and wait for the sender to reply with its bundle URL.
fn discover_url(code: &str) -> Result<String, AppError> {
    let code = normalize_code(code)?;
    let socket = UdpSocket::bind("0.0.0.0:0")
        .map_err(|error| AppError::Internal(format!("sync discovery socket: {error}")))?;
    socket
        .set_broadcast(true)
        .map_err(|error| AppError::Internal(format!("sync broadcast: {error}")))?;
    socket
        .set_read_timeout(Some(Duration::from_millis(400)))
        .map_err(|error| AppError::Internal(format!("sync discovery timeout: {error}")))?;
    let probe = build_probe(&code);
    let deadline = Instant::now() + Duration::from_secs(5);
    let mut buffer = [0u8; 1024];
    while Instant::now() < deadline {
        // Send more than once: UDP is lossy and the sender may still be
        // starting its responder thread.
        for _ in 0..2 {
            let _ = socket.send_to(probe.as_bytes(), ("255.255.255.255", DISCOVERY_PORT));
        }
        match socket.recv_from(&mut buffer) {
            Ok((length, _peer)) => {
                let payload = String::from_utf8_lossy(&buffer[..length]);
                if let Some(url) = parse_reply(payload.trim()) {
                    return Ok(url.to_string());
                }
            }
            Err(error)
                if error.kind() == std::io::ErrorKind::WouldBlock
                    || error.kind() == std::io::ErrorKind::TimedOut => {}
            Err(error) => {
                return Err(AppError::Internal(format!(
                    "sync discovery failed: {error}"
                )))
            }
        }
    }
    Err(AppError::Validation(
        "no device answered the sync code; check the same Wi-Fi and try the QR".into(),
    ))
}

fn bundle(state: &AppState, ui_json: String) -> Result<SyncBundle, AppError> {
    let teams = state.teams.list()?;
    let settings = state
        .settings
        .all()?
        .into_iter()
        .filter(|(key, _)| SETTINGS_WHITELIST.contains(&key.as_str()))
        .collect();
    Ok(SyncBundle {
        schema: SYNC_SCHEMA,
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        exported_at: Utc::now().to_rfc3339(),
        teams,
        settings,
        ui_json,
    })
}

/// Starts a temporary HTTP server on the LAN and returns the URL encoded in
/// the QR/code shown by Settings. The server serves exactly one bundle and
/// expires after two minutes.
#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub fn sync_start_send(
    state: State<'_, AppState>,
    ui_json: String,
) -> Result<SyncSession, AppError> {
    let bundle = bundle(&state, ui_json)?;
    let payload = serde_json::to_vec(&bundle)?;
    let local = local_ip_address::local_ip()
        .map_err(|error| AppError::Internal(format!("LAN IP unavailable: {error}")))?;
    let server = Server::http("0.0.0.0:0")
        .map_err(|error| AppError::Internal(format!("sync server: {error}")))?;
    let port = server
        .server_addr()
        .to_ip()
        .map(|address| address.port())
        .ok_or_else(|| AppError::Internal("sync server has no port".into()))?;
    let token = token();
    let code = code();
    let url = format!("http://{local}:{port}/bundle?token={token}");
    let expires_at = (Utc::now() + ChronoDuration::seconds(SESSION_SECONDS as i64)).to_rfc3339();
    let server = Arc::new(server);
    let worker = server.clone();
    std::thread::spawn(move || {
        let deadline = Instant::now() + Duration::from_secs(SESSION_SECONDS);
        while Instant::now() < deadline {
            let request = match worker.recv_timeout(Duration::from_millis(500)) {
                Ok(Some(request)) => request,
                Ok(None) => continue,
                Err(_) => break,
            };
            let requested_token = request
                .url()
                .split("token=")
                .nth(1)
                .unwrap_or_default()
                .split('&')
                .next()
                .unwrap_or_default();
            if requested_token != token {
                let _ = request.respond(Response::from_string("forbidden").with_status_code(403));
                continue;
            }
            let content_type =
                Header::from_bytes("Content-Type", "application/json").expect("static header");
            let _ = request.respond(Response::from_data(payload.clone()).with_header(content_type));
            break;
        }
    });

    // Answer code probes for the lifetime of this session. If the port is
    // already taken (another session, another app) the QR/URL flow still works.
    let discovery_code = code.clone();
    let discovery_url = url.clone();
    std::thread::spawn(move || match UdpSocket::bind(("0.0.0.0", DISCOVERY_PORT)) {
        Ok(socket) => {
            let _ = socket.set_read_timeout(Some(Duration::from_millis(500)));
            let deadline = Instant::now() + Duration::from_secs(SESSION_SECONDS);
            let mut buffer = [0u8; 512];
            while Instant::now() < deadline {
                match socket.recv_from(&mut buffer) {
                    Ok((length, peer)) => {
                        let payload = String::from_utf8_lossy(&buffer[..length]);
                        if parse_probe(payload.trim()) == Some(discovery_code.as_str()) {
                            let _ = socket.send_to(build_reply(&discovery_url).as_bytes(), peer);
                        }
                    }
                    Err(error)
                        if error.kind() == std::io::ErrorKind::WouldBlock
                            || error.kind() == std::io::ErrorKind::TimedOut => {}
                    Err(_) => break,
                }
            }
        }
        Err(error) => {
            tracing::warn!(%error, "sync discovery unavailable; use the QR or URL");
        }
    });

    Ok(SyncSession {
        code,
        url,
        expires_at,
    })
}

/// Fetch a bundle from a peer on the same LAN. Parsed by Rust so Android's
/// WebView cleartext policy never applies to sync.
async fn fetch_bundle(url: &str) -> Result<SyncBundle, AppError> {
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return Err(AppError::Validation("sync URL must use http(s)".into()));
    }
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|error| AppError::Http(error.to_string()))?;
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|error| AppError::Http(error.to_string()))?;
    if !response.status().is_success() {
        return Err(AppError::Http(format!(
            "sync peer returned {}",
            response.status()
        )));
    }
    let bytes = response
        .bytes()
        .await
        .map_err(|error| AppError::Http(error.to_string()))?;
    if bytes.len() > 2 * 1024 * 1024 {
        return Err(AppError::Validation("sync bundle is too large".into()));
    }
    let bundle: SyncBundle = serde_json::from_slice(&bytes)?;
    if bundle.schema != SYNC_SCHEMA {
        return Err(AppError::Validation(format!(
            "unsupported sync schema {}",
            bundle.schema
        )));
    }
    Ok(bundle)
}

#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub async fn sync_fetch(url: String) -> Result<SyncBundle, AppError> {
    fetch_bundle(&url).await
}

/// Receive a bundle using only the 8-character code. The sender answers the
/// UDP probe with its temporary URL; the token in that URL still protects the
/// payload.
#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub async fn sync_fetch_by_code(code: String) -> Result<SyncBundle, AppError> {
    let url = tokio::task::spawn_blocking(move || discover_url(&code))
        .await
        .map_err(|error| AppError::Internal(format!("sync discovery task: {error}")))??;
    fetch_bundle(&url).await
}

/// Import teams/settings after the user reviewed conflicts in the UI. Teams
/// are always created as new rows; the frontend renames, replaces or skips
/// conflicts before calling this.
#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub fn sync_import(
    state: State<'_, AppState>,
    mut bundle: SyncBundle,
) -> Result<SyncImportResult, AppError> {
    if bundle.schema != SYNC_SCHEMA {
        return Err(AppError::Validation("unsupported sync schema".into()));
    }
    // Validate everything before writing so a malformed peer cannot leave a
    // half-imported team list behind.
    for team in &bundle.teams {
        team.validate()
            .map_err(|error| AppError::Validation(error.to_string()))?;
    }
    let mut teams_imported = 0u32;
    for team in &mut bundle.teams {
        team.id = None;
        state.teams.save(team)?;
        teams_imported += 1;
    }
    let mut settings_imported = 0u32;
    for (key, value) in &bundle.settings {
        if !SETTINGS_WHITELIST.contains(&key.as_str()) {
            continue;
        }
        match state.settings.set(key, value) {
            Ok(()) => settings_imported += 1,
            Err(error) => tracing::warn!(%error, %key, "sync setting skipped"),
        }
    }
    tracing::info!(teams_imported, settings_imported, "sync import complete");
    Ok(SyncImportResult {
        teams_imported,
        settings_imported,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn discovery_probe_round_trips_the_code() {
        let probe = build_probe("ABCD2345");
        assert_eq!(parse_probe(&probe), Some("ABCD2345"));
        assert_eq!(parse_probe("other"), None);
    }

    #[test]
    fn discovery_reply_only_accepts_http_urls() {
        let reply = build_reply("http://192.168.1.5:8080/bundle?token=abc");
        assert_eq!(
            parse_reply(&reply),
            Some("http://192.168.1.5:8080/bundle?token=abc")
        );
        assert_eq!(parse_reply("VGCREP1 URL file:///etc/passwd"), None);
    }

    #[test]
    fn codes_are_normalized_and_validated() {
        assert_eq!(normalize_code(" abcd2345 ").unwrap(), "ABCD2345");
        assert!(normalize_code("ABC").is_err());
        assert!(normalize_code("ABCD-234").is_err());
    }
}
