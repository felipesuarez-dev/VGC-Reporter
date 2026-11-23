use crate::domain::sync::{
    SyncBundle, SyncSession, SyncSessionStatus, SyncState, SyncTicket, SYNC_CODE_ALPHABET,
    SYNC_CODE_LEN, SYNC_MAX_PAYLOAD_BYTES, SYNC_SCHEMA, SYNC_SESSION_SECONDS, SYNC_TICKET_VERSION,
};
use crate::error::AppError;
use chrono::{DateTime, Duration as ChronoDuration, Utc};
use rand::rngs::OsRng;
use rand::RngCore;
use std::collections::HashMap;
use std::net::UdpSocket;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tiny_http::{Header, Response, Server};

/// The service stays independent from Tauri. Commands pass a sink that
/// forwards state changes to the webview; tests pass `None`.
pub type SyncEventSink = Arc<dyn Fn(SyncSessionStatus) + Send + Sync>;

const DISCOVERY_PORT: u16 = 47823;
const DISCOVERY_PROTOCOL: &str = "VGCREP1";
const BUNDLE_PATH: &str = "/sync/v1/bundle";
const LEGACY_BUNDLE_PATH: &str = "/bundle";

pub fn normalize_code(raw: &str) -> Result<String, AppError> {
    let code = raw.trim().to_uppercase();
    if code.len() != SYNC_CODE_LEN || !code.bytes().all(|byte| SYNC_CODE_ALPHABET.contains(&byte)) {
        return Err(AppError::Validation(
            "the sync code must have 8 unambiguous letters or digits".into(),
        ));
    }
    Ok(code)
}

pub fn generate_code() -> String {
    let mut rng = OsRng;
    (0..SYNC_CODE_LEN)
        .map(|_| {
            let index = (rng.next_u32() as usize) % SYNC_CODE_ALPHABET.len();
            SYNC_CODE_ALPHABET[index] as char
        })
        .collect()
}

/// 128 random bits rendered as 32 lowercase hex characters.
pub fn generate_token() -> String {
    let mut bytes = [0u8; 16];
    OsRng.fill_bytes(&mut bytes);
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

pub fn normalize_token(raw: &str) -> Result<String, AppError> {
    let token = raw.trim().to_lowercase();
    if token.len() != 32 || !token.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return Err(AppError::Validation(
            "the sync token must be 32 hexadecimal characters".into(),
        ));
    }
    Ok(token)
}

pub fn format_ticket(ticket: &SyncTicket) -> String {
    format!(
        "vgcreporter://sync?v={}&code={}&token={}&host={}&port={}",
        ticket.version, ticket.code, ticket.token, ticket.host, ticket.port
    )
}

pub fn ticket_http_url(ticket: &SyncTicket) -> String {
    format!(
        "http://{}:{}{}?token={}",
        ticket.host, ticket.port, BUNDLE_PATH, ticket.token
    )
}

pub fn is_http_url(value: &str) -> bool {
    value.starts_with("http://") || value.starts_with("https://")
}

pub fn parse_ticket(raw: &str) -> Result<SyncTicket, AppError> {
    let value = raw.trim();
    let rest = value
        .strip_prefix("vgcreporter://sync?")
        .or_else(|| value.strip_prefix("vgcreporter://sync/?"))
        .ok_or_else(|| AppError::Validation("not a VGC Reporter sync ticket".into()))?;
    let version = query_value(rest, "v")
        .and_then(|value| value.parse::<u8>().ok())
        .ok_or_else(|| AppError::Validation("sync ticket has no version".into()))?;
    if version != SYNC_TICKET_VERSION {
        return Err(AppError::Validation(format!(
            "unsupported sync ticket version {version}"
        )));
    }
    let code = normalize_code(
        &query_value(rest, "code")
            .ok_or_else(|| AppError::Validation("sync ticket has no code".into()))?,
    )?;
    let token = normalize_token(
        &query_value(rest, "token")
            .ok_or_else(|| AppError::Validation("sync ticket has no token".into()))?,
    )?;
    let host = query_value(rest, "host")
        .ok_or_else(|| AppError::Validation("sync ticket has no host".into()))?
        .trim()
        .to_string();
    if host.is_empty()
        || host.contains('/')
        || host.contains('?')
        || host.contains('#')
        || host.chars().any(char::is_whitespace)
        || !host
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '.' | '-' | ':'))
    {
        return Err(AppError::Validation("invalid sync ticket host".into()));
    }
    let port = query_value(rest, "port")
        .and_then(|value| value.parse::<u16>().ok())
        .filter(|port| *port > 0)
        .ok_or_else(|| AppError::Validation("sync ticket has no valid port".into()))?;
    Ok(SyncTicket {
        version,
        code,
        token,
        host,
        port,
    })
}

fn query_value(query: &str, key: &str) -> Option<String> {
    let query = query.split_once('?').map(|(_, rest)| rest).unwrap_or(query);
    let query = query.split('#').next().unwrap_or(query);
    for part in query.split('&') {
        let (candidate, value) = part.split_once('=').unwrap_or((part, ""));
        if candidate == key {
            return urlencoding::decode(value)
                .ok()
                .map(|value| value.into_owned());
        }
    }
    None
}

pub fn validate_bundle(bundle: &SyncBundle) -> Result<(), AppError> {
    if bundle.schema != SYNC_SCHEMA {
        return Err(AppError::Validation(format!(
            "unsupported sync schema {}",
            bundle.schema
        )));
    }
    Ok(())
}

pub fn validate_payload(payload: &[u8]) -> Result<(), AppError> {
    if payload.len() > SYNC_MAX_PAYLOAD_BYTES {
        return Err(AppError::Validation(format!(
            "sync bundle is too large ({} bytes, max {})",
            payload.len(),
            SYNC_MAX_PAYLOAD_BYTES
        )));
    }
    Ok(())
}

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
    if is_http_url(url) {
        Some(url)
    } else {
        None
    }
}

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
        "no device answered the sync code; check the same Wi-Fi or use the QR".into(),
    ))
}

pub async fn fetch_bundle(ticket_or_url: &str) -> Result<SyncBundle, AppError> {
    let url = if is_http_url(ticket_or_url) {
        ticket_or_url.to_string()
    } else {
        ticket_http_url(&parse_ticket(ticket_or_url)?)
    };
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|error| AppError::Http(error.to_string()))?;
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|error| AppError::Http(error.to_string()))?;
    let status = response.status();
    if !status.is_success() {
        let message = match status.as_u16() {
            403 => "the sync token was rejected".to_string(),
            404 => "the sync session is not available".to_string(),
            409 => "this sync session was already used".to_string(),
            410 => "this sync session expired".to_string(),
            _ => format!("sync peer returned {status}"),
        };
        return Err(AppError::Validation(message));
    }
    let bytes = response
        .bytes()
        .await
        .map_err(|error| AppError::Http(error.to_string()))?;
    validate_payload(&bytes)?;
    let bundle: SyncBundle = serde_json::from_slice(&bytes)?;
    validate_bundle(&bundle)?;
    Ok(bundle)
}

pub async fn fetch_by_code(code: &str) -> Result<SyncBundle, AppError> {
    let url = tokio::task::spawn_blocking({
        let code = code.to_string();
        move || discover_url(&code)
    })
    .await
    .map_err(|error| AppError::Internal(format!("sync discovery task: {error}")))??;
    fetch_bundle(&url).await
}

struct SessionHandle {
    code: String,
    token: String,
    expires_at: DateTime<Utc>,
    deadline: Instant,
    cancel: AtomicBool,
    state: Mutex<SyncState>,
    error: Mutex<Option<String>>,
    teams: u32,
    settings: u32,
    ui_stores: u32,
    sink: Option<SyncEventSink>,
}

impl SessionHandle {
    fn status(&self) -> SyncSessionStatus {
        SyncSessionStatus {
            code: self.code.clone(),
            state: self
                .state
                .lock()
                .map(|state| *state)
                .unwrap_or(SyncState::Error),
            expires_at: self.expires_at.to_rfc3339(),
            teams: self.teams,
            settings: self.settings,
            ui_stores: self.ui_stores,
            error: self.error.lock().ok().and_then(|error| error.clone()),
        }
    }

    fn set_state(&self, state: SyncState) {
        if let Ok(mut current) = self.state.lock() {
            *current = state;
        }
        if let Some(sink) = &self.sink {
            sink(self.status());
        }
    }

    fn set_error(&self, message: String) {
        if let Ok(mut error) = self.error.lock() {
            *error = Some(message);
        }
        self.set_state(SyncState::Error);
    }

    fn is_cancelled(&self) -> bool {
        self.cancel.load(Ordering::Relaxed)
    }

    fn expired(&self) -> bool {
        Instant::now() >= self.deadline
    }
}

/// Tracks the temporary LAN sessions so the UI can show their state, cancel
/// them, and let the sender know when the receiver imported the bundle.
#[derive(Default, Clone)]
pub struct SyncManager {
    sessions: Arc<Mutex<HashMap<String, Arc<SessionHandle>>>>,
}

impl SyncManager {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn start(
        &self,
        bundle: SyncBundle,
        sink: Option<SyncEventSink>,
    ) -> Result<SyncSession, AppError> {
        let local = local_ip_address::local_ip()
            .map_err(|error| AppError::Internal(format!("LAN IP unavailable: {error}")))?;
        self.start_inner(bundle, sink, &local.to_string(), SYNC_SESSION_SECONDS, true)
    }

    fn start_inner(
        &self,
        bundle: SyncBundle,
        sink: Option<SyncEventSink>,
        host: &str,
        ttl_seconds: u64,
        with_discovery: bool,
    ) -> Result<SyncSession, AppError> {
        let payload = serde_json::to_vec(&bundle)?;
        validate_payload(&payload)?;
        let server = Server::http("0.0.0.0:0")
            .map_err(|error| AppError::Internal(format!("sync server: {error}")))?;
        let port = server
            .server_addr()
            .to_ip()
            .map(|address| address.port())
            .ok_or_else(|| AppError::Internal("sync server has no port".into()))?;
        let code = generate_code();
        let token = generate_token();
        let ticket = SyncTicket {
            version: SYNC_TICKET_VERSION,
            code: code.clone(),
            token: token.clone(),
            host: host.to_string(),
            port,
        };
        let url = ticket_http_url(&ticket);
        let expires_at = Utc::now() + ChronoDuration::seconds(ttl_seconds as i64);
        let ui_stores = serde_json::from_str::<serde_json::Value>(&bundle.ui_json)
            .ok()
            .and_then(|value| value.as_object().map(|object| object.len() as u32))
            .unwrap_or(0);
        let handle = Arc::new(SessionHandle {
            code: code.clone(),
            token,
            expires_at,
            deadline: Instant::now() + Duration::from_secs(ttl_seconds),
            cancel: AtomicBool::new(false),
            state: Mutex::new(SyncState::Waiting),
            error: Mutex::new(None),
            teams: bundle.teams.len() as u32,
            settings: bundle.settings.len() as u32,
            ui_stores,
            sink: sink.clone(),
        });
        {
            let mut sessions = self
                .sessions
                .lock()
                .map_err(|_| AppError::Internal("sync session registry poisoned".into()))?;
            sessions.retain(|_, session| !session.expired());
            sessions.insert(code.clone(), handle.clone());
        }
        if let Some(sink) = &sink {
            sink(handle.status());
        }

        let server = Arc::new(server);
        let worker_handle = handle.clone();
        std::thread::spawn(move || serve_bundle(server, worker_handle, payload));

        if with_discovery {
            let discovery_url = url.clone();
            let discovery_code = code.clone();
            let discovery_cancel = handle.clone();
            std::thread::spawn(move || {
                serve_discovery(&discovery_code, &discovery_url, discovery_cancel)
            });
        }

        Ok(SyncSession {
            version: SYNC_TICKET_VERSION,
            code,
            ticket: format_ticket(&ticket),
            url,
            expires_at: expires_at.to_rfc3339(),
            teams: bundle.teams.len() as u32,
            settings: bundle.settings.len() as u32,
            ui_stores,
        })
    }

    pub fn status(&self, code: &str) -> Result<SyncSessionStatus, AppError> {
        let code = normalize_code(code)?;
        self.sessions
            .lock()
            .map_err(|_| AppError::Internal("sync session registry poisoned".into()))?
            .get(&code)
            .map(|session| session.status())
            .ok_or_else(|| AppError::NotFound("sync session not found".into()))
    }

    pub fn cancel(&self, code: &str) -> Result<SyncSessionStatus, AppError> {
        let code = normalize_code(code)?;
        let session = self
            .sessions
            .lock()
            .map_err(|_| AppError::Internal("sync session registry poisoned".into()))?
            .get(&code)
            .cloned()
            .ok_or_else(|| AppError::NotFound("sync session not found".into()))?;
        session.cancel.store(true, Ordering::Relaxed);
        session.set_state(SyncState::Cancelled);
        Ok(session.status())
    }

    pub fn mark_imported(&self, code: &str) -> Result<SyncSessionStatus, AppError> {
        let code = normalize_code(code)?;
        let session = self
            .sessions
            .lock()
            .map_err(|_| AppError::Internal("sync session registry poisoned".into()))?
            .get(&code)
            .cloned()
            .ok_or_else(|| AppError::NotFound("sync session not found".into()))?;
        session.set_state(SyncState::Imported);
        Ok(session.status())
    }

    #[cfg(test)]
    fn start_loopback(
        &self,
        bundle: SyncBundle,
        ttl_seconds: u64,
    ) -> Result<SyncSession, AppError> {
        self.start_inner(bundle, None, "127.0.0.1", ttl_seconds, false)
    }
}

fn serve_bundle(server: Arc<Server>, handle: Arc<SessionHandle>, payload: Vec<u8>) {
    let mut served = false;
    while !handle.is_cancelled() && !handle.expired() {
        let request = match server.recv_timeout(Duration::from_millis(250)) {
            Ok(Some(request)) => request,
            Ok(None) => continue,
            Err(_) => break,
        };
        let path = request.url().split('?').next().unwrap_or_default();
        if path != BUNDLE_PATH && path != LEGACY_BUNDLE_PATH {
            let _ = request.respond(Response::from_string("not found").with_status_code(404));
            continue;
        }
        let provided = query_value(request.url(), "token");
        if provided.as_deref() != Some(handle.token.as_str()) {
            let _ = request.respond(Response::from_string("forbidden").with_status_code(403));
            continue;
        }
        if handle.expired() {
            let _ = request.respond(Response::from_string("expired").with_status_code(410));
            handle.set_state(SyncState::Expired);
            break;
        }
        if served {
            let _ = request.respond(Response::from_string("already used").with_status_code(409));
            continue;
        }
        served = true;
        handle.set_state(SyncState::Connected);
        handle.set_state(SyncState::Transferring);
        let content_type = Header::from_bytes("Content-Type", "application/json")
            .expect("static content-type header");
        let no_store =
            Header::from_bytes("Cache-Control", "no-store").expect("static cache-control header");
        let version = Header::from_bytes("X-VGC-Sync-Version", SYNC_TICKET_VERSION.to_string())
            .expect("static sync version header");
        match request.respond(
            Response::from_data(payload.clone())
                .with_header(content_type)
                .with_header(no_store)
                .with_header(version),
        ) {
            Ok(()) => handle.set_state(SyncState::Received),
            Err(error) => handle.set_error(format!("sync transfer failed: {error}")),
        }
        break;
    }
    if !served && !handle.is_cancelled() {
        handle.set_state(SyncState::Expired);
    }
}

fn serve_discovery(code: &str, url: &str, handle: Arc<SessionHandle>) {
    let socket = match UdpSocket::bind(("0.0.0.0", DISCOVERY_PORT)) {
        Ok(socket) => socket,
        Err(error) => {
            tracing::warn!(%error, "sync discovery unavailable; use the QR or advanced URL");
            return;
        }
    };
    let _ = socket.set_read_timeout(Some(Duration::from_millis(400)));
    let mut buffer = [0u8; 512];
    while !handle.is_cancelled() && !handle.expired() {
        match socket.recv_from(&mut buffer) {
            Ok((length, peer)) => {
                let payload = String::from_utf8_lossy(&buffer[..length]);
                if parse_probe(payload.trim()) == Some(code) {
                    let _ = socket.send_to(build_reply(url).as_bytes(), peer);
                }
            }
            Err(error)
                if error.kind() == std::io::ErrorKind::WouldBlock
                    || error.kind() == std::io::ErrorKind::TimedOut => {}
            Err(_) => break,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::format::Format;
    use crate::domain::team::{Team, TeamMember};
    use std::collections::HashMap;

    fn empty_bundle() -> SyncBundle {
        SyncBundle {
            schema: SYNC_SCHEMA,
            app_version: "0.6.2".into(),
            exported_at: Utc::now().to_rfc3339(),
            teams: vec![Team {
                id: None,
                name: "Sync test".into(),
                format: Format::mc(),
                build_mode: crate::domain::team::BuildMode::Champions,
                notes: None,
                members: (0..6)
                    .map(|index| TeamMember::empty(format!("pkm{index}")))
                    .collect(),
                created_at: None,
                updated_at: None,
            }],
            settings: HashMap::from([("language".to_string(), "es".to_string())]),
            ui_json: "{\"vgc-ui\":{}}".into(),
        }
    }

    #[test]
    fn codes_are_normalized_and_use_the_unambiguous_alphabet() {
        assert_eq!(normalize_code(" abcd2345 ").unwrap(), "ABCD2345");
        assert!(normalize_code("ABC").is_err());
        assert!(normalize_code("ABCD-234").is_err());
        assert!(normalize_code("ABCD2340").is_err());
        for _ in 0..200 {
            let code = generate_code();
            assert_eq!(code.len(), 8);
            assert!(code.bytes().all(|byte| SYNC_CODE_ALPHABET.contains(&byte)));
        }
    }

    #[test]
    fn tokens_have_128_bits_and_are_unique() {
        let first = generate_token();
        let second = generate_token();
        assert_eq!(first.len(), 32);
        assert!(first.bytes().all(|byte| byte.is_ascii_hexdigit()));
        assert_ne!(first, second);
    }

    #[test]
    fn tickets_round_trip_and_reject_invalid_fields() {
        let ticket = SyncTicket {
            version: 1,
            code: "AB23CD45".into(),
            token: "a".repeat(32),
            host: "192.168.1.20".into(),
            port: 47821,
        };
        let encoded = format_ticket(&ticket);
        assert_eq!(parse_ticket(&encoded).unwrap(), ticket);
        assert_eq!(
            ticket_http_url(&ticket),
            "http://192.168.1.20:47821/sync/v1/bundle?token=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        );
        assert!(parse_ticket("vgcreporter://sync?v=2&code=AB23CD45&token=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&host=1.2.3.4&port=1").is_err());
        assert!(parse_ticket("vgcreporter://sync?v=1&code=AB23CD&token=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&host=1.2.3.4&port=1").is_err());
        assert!(parse_ticket(
            "vgcreporter://sync?v=1&code=AB23CD45&token=short&host=1.2.3.4&port=1"
        )
        .is_err());
        assert!(parse_ticket("vgcreporter://sync?v=1&code=AB23CD45&token=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&host=bad/host&port=1").is_err());
        assert!(parse_ticket("vgcreporter://sync?v=1&code=AB23CD45&token=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&host=1.2.3.4&port=0").is_err());
    }

    #[test]
    fn discovery_probe_and_reply_round_trip() {
        assert_eq!(parse_probe(&build_probe("ABCD2345")), Some("ABCD2345"));
        assert_eq!(parse_probe("other"), None);
        assert_eq!(
            parse_reply(&build_reply(
                "http://192.168.1.5:8080/sync/v1/bundle?token=abc"
            )),
            Some("http://192.168.1.5:8080/sync/v1/bundle?token=abc")
        );
        assert_eq!(parse_reply("VGCREP1 URL file:///etc/passwd"), None);
    }

    #[test]
    fn payload_limit_and_schema_are_enforced() {
        assert!(validate_payload(&vec![0u8; SYNC_MAX_PAYLOAD_BYTES + 1]).is_err());
        let mut bundle = empty_bundle();
        bundle.schema = 99;
        assert!(validate_bundle(&bundle).is_err());
    }

    #[tokio::test]
    async fn loopback_server_serves_once_and_rejects_a_bad_token() {
        let manager = SyncManager::new();
        let session = manager
            .start_loopback(empty_bundle(), 30)
            .expect("start loopback");
        let ticket = parse_ticket(&session.ticket).expect("ticket");
        let url = ticket_http_url(&ticket);

        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(2))
            .build()
            .expect("test client");
        let forbidden = client
            .get(format!(
                "http://127.0.0.1:{}/sync/v1/bundle?token={}",
                ticket.port,
                "0".repeat(32)
            ))
            .send()
            .await
            .expect("forbidden request");
        assert_eq!(forbidden.status().as_u16(), 403);

        let first = client.get(&url).send().await.expect("first request");
        assert_eq!(first.status().as_u16(), 200);
        let bundle: SyncBundle = first.json().await.expect("bundle json");
        assert_eq!(bundle.schema, SYNC_SCHEMA);

        // The temporary server stops after the first successful transfer. A
        // second request either finds the socket closed or gets 409 while the
        // worker is still shutting down; it must never receive the payload.
        if let Ok(second) = client.get(&url).send().await {
            assert_ne!(second.status().as_u16(), 200);
        }
        assert_eq!(
            manager.status(&session.code).unwrap().state,
            SyncState::Received
        );
        manager.mark_imported(&session.code).unwrap();
        assert_eq!(
            manager.status(&session.code).unwrap().state,
            SyncState::Imported
        );
    }

    #[tokio::test]
    async fn fetch_ticket_returns_the_bundle_and_honours_the_token() {
        let manager = SyncManager::new();
        let session = manager
            .start_loopback(empty_bundle(), 30)
            .expect("start loopback");
        let fetched = fetch_bundle(&session.ticket).await.expect("fetch ticket");
        assert_eq!(
            fetched.settings.get("language").map(String::as_str),
            Some("es")
        );
    }
}
