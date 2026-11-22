use crate::adapters::HttpClient;
use crate::config;
use crate::domain::regulation::OfficialLiveStream;
use crate::error::AppError;
use regex::Regex;
use std::sync::Arc;

/// Play! Pokémon is the official VGC broadcast channel. The user can override
/// it in Settings; an empty setting keeps this default.
pub const DEFAULT_SOURCE: &str = "https://www.youtube.com/@PlayPokemon";
/// Community VGC streamer added as the second default screen (Chilean, streams
/// VGC almost every day).
pub const DEFAULT_COMMUNITY_SOURCE: &str = "https://www.youtube.com/@yuksvgc";
/// A second well-known VGC caster, useful when the official channel is between
/// events and YukS is offline.
pub const DEFAULT_VGC_CASTER_SOURCE: &str = "https://www.youtube.com/@CybertronVGC";
pub const DEFAULT_WOLFEY_SOURCE: &str = "https://www.youtube.com/@WolfeyVGC";
pub const DEFAULT_JAMES_SOURCE: &str = "https://www.youtube.com/@JamesBaek";
pub const DEFAULT_POKEALEX_SOURCE: &str = "https://www.youtube.com/@PokeAlex";
pub const DEFAULT_MOXIE_SOURCE: &str = "https://www.youtube.com/@Moxie2D";
pub const DEFAULT_POKEMON_CHAMPIONS_SOURCE: &str = "https://www.youtube.com/@PokemonChampions";
pub const DEFAULT_SEKIAM_SOURCE: &str = "https://www.youtube.com/@Sekiam";
/// Chilean VGC channel (Pokémon VGC Chile Invitational).
pub const DEFAULT_IRNEMESIS_SOURCE: &str = "https://www.youtube.com/@IRNemesisTV";
/// Old default watch-party URL shipped before 0.6.0. It is not a channel and
/// must never come back as "latest stream": remove it from stored settings.
pub const LEGACY_INDER_LIVE: &str = "https://www.youtube.com/watch?v=tP09BzCEJqU";

/// Curated default screens. The user can reorder or remove them in Settings.
pub const DEFAULT_LIVE_SCREENS: &[&str] = &[
    DEFAULT_COMMUNITY_SOURCE,
    DEFAULT_SOURCE,
    DEFAULT_WOLFEY_SOURCE,
    DEFAULT_VGC_CASTER_SOURCE,
    DEFAULT_JAMES_SOURCE,
    DEFAULT_POKEALEX_SOURCE,
    DEFAULT_MOXIE_SOURCE,
    DEFAULT_POKEMON_CHAMPIONS_SOURCE,
    DEFAULT_SEKIAM_SOURCE,
    DEFAULT_IRNEMESIS_SOURCE,
];

const HEADERS: &[(&str, &str)] = &[("Accept-Language", "en-US,en;q=0.9")];

#[derive(Clone)]
pub struct OfficialStreamClient {
    http: Arc<HttpClient>,
}

impl OfficialStreamClient {
    pub fn new(http: Arc<HttpClient>) -> Self {
        Self { http }
    }

    /// Official VGC live broadcast, if there is one. YouTube is not a stable
    /// API, so `None` simply collapses the Feed live panel.
    ///
    /// The Play! Pokémon channel can broadcast GO, TCG and VGC at the same
    /// time. The channel `/live` page picks whichever stream YouTube prefers
    /// (often GO), so we read the channel `/streams` tab instead and keep only
    /// live entries whose title identifies the VGC/Champions broadcast.
    pub async fn live(
        &self,
        force: bool,
        source: Option<&str>,
    ) -> Result<Option<OfficialLiveStream>, AppError> {
        self.live_with_filter(force, source, true).await
    }

    /// Like [`Self::live`], but accepts any live title. Community channels do
    /// not always put "VGC" in the stream title, so filtering by title there
    /// would hide a valid broadcast.
    pub async fn live_any(
        &self,
        force: bool,
        source: Option<&str>,
    ) -> Result<Option<OfficialLiveStream>, AppError> {
        self.live_with_filter(force, source, false).await
    }

    /// Latest past broadcast for a channel/video, used as a fallback when
    /// nothing is live. The returned stream always has `live: false`.
    pub async fn recent(
        &self,
        force: bool,
        source: Option<&str>,
        vgc_only: bool,
    ) -> Result<Option<OfficialLiveStream>, AppError> {
        let resolved = resolve_source(source);
        if !is_youtube(&resolved) {
            return Ok(None);
        }
        let ttl = if force {
            0
        } else {
            config::TTL_OFFICIAL_STREAM
        };
        // An explicit video is not a channel, so it has no "latest past
        // broadcast" we can trust. Returning None avoids presenting an old
        // watch-party link as if it were the channel's latest stream.
        if youtube_video_id(&resolved).is_some() {
            return Ok(None);
        }
        let streams_url = channel_streams_url(&resolved);
        match self
            .http
            .get_cached_with_headers(&streams_url, HEADERS, ttl)
            .await
        {
            Ok(bytes) => Ok(parse_streams_page(
                &String::from_utf8_lossy(&bytes),
                vgc_only,
                false,
            )),
            Err(_) => Ok(None),
        }
    }

    pub(crate) async fn live_with_filter(
        &self,
        force: bool,
        source: Option<&str>,
        vgc_only: bool,
    ) -> Result<Option<OfficialLiveStream>, AppError> {
        let resolved = resolve_source(source);
        if !is_youtube(&resolved) {
            return Ok(None);
        }
        let ttl = if force {
            0
        } else {
            config::TTL_OFFICIAL_STREAM
        };

        // An explicit video URL is verified against its watch page: a past
        // broadcast must not be presented as live.
        if let Some(video_id) = youtube_video_id(&resolved) {
            let watch_url = format!("https://www.youtube.com/watch?v={video_id}");
            let bytes = self
                .http
                .get_cached_with_headers(&watch_url, HEADERS, ttl)
                .await?;
            return Ok(parse_watch_page_live(
                &String::from_utf8_lossy(&bytes),
                &video_id,
            ));
        }

        let streams_url = channel_streams_url(&resolved);
        match self
            .http
            .get_cached_with_headers(&streams_url, HEADERS, ttl)
            .await
        {
            Ok(bytes) => {
                if let Some(stream) =
                    parse_streams_page(&String::from_utf8_lossy(&bytes), vgc_only, true)
                {
                    return Ok(Some(stream));
                }
            }
            Err(error) => tracing::warn!(
                %error,
                %streams_url,
                "live streams page unavailable"
            ),
        }

        // Fallback for channel pages where the streams tab is not parseable.
        let live_url = channel_live_url(&resolved);
        match self
            .http
            .get_cached_with_headers(&live_url, HEADERS, ttl)
            .await
        {
            Ok(bytes) => Ok(parse_live_page(&String::from_utf8_lossy(&bytes), vgc_only)),
            Err(error) => {
                tracing::warn!(%error, %live_url, "live page unavailable");
                Ok(None)
            }
        }
    }
}

fn resolve_source(source: Option<&str>) -> String {
    let raw = source.map(str::trim).filter(|value| !value.is_empty());
    let Some(raw) = raw else {
        return DEFAULT_SOURCE.to_string();
    };
    if raw.starts_with("http://") || raw.starts_with("https://") {
        return raw.to_string();
    }
    if raw.starts_with('@') {
        return format!("https://www.youtube.com/{raw}");
    }
    if raw.starts_with("www.youtube.com/") || raw.starts_with("youtube.com/") {
        return format!("https://{raw}");
    }
    format!("https://www.youtube.com/{raw}")
}

fn is_youtube(url: &str) -> bool {
    url.contains("youtube.com/") || url.contains("youtu.be/")
}

fn youtube_video_id(url: &str) -> Option<String> {
    let re = Regex::new(r#"(?:v=|youtu\.be/|/live/|/embed/|/shorts/)([A-Za-z0-9_-]{11})"#).ok()?;
    re.captures(url).map(|capture| capture[1].to_string())
}

/// Strip the tab segment from a channel URL and append `/streams`.
fn channel_streams_url(url: &str) -> String {
    let base = url.split(['?', '#']).next().unwrap_or(url);
    let trimmed = base.trim_end_matches('/');
    let root = ["/live", "/streams", "/videos", "/featured"]
        .iter()
        .find_map(|suffix| trimmed.strip_suffix(suffix))
        .unwrap_or(trimmed);
    format!("{root}/streams")
}

fn channel_live_url(url: &str) -> String {
    let base = url.split(['?', '#']).next().unwrap_or(url);
    let trimmed = base.trim_end_matches('/');
    let root = ["/live", "/streams", "/videos", "/featured"]
        .iter()
        .find_map(|suffix| trimmed.strip_suffix(suffix))
        .unwrap_or(trimmed);
    format!("{root}/live")
}

fn stream(video_id: &str, title: String) -> OfficialLiveStream {
    OfficialLiveStream {
        video_id: video_id.to_string(),
        title,
        url: format!("https://www.youtube.com/watch?v={video_id}"),
        embed_url: format!("https://www.youtube-nocookie.com/embed/{video_id}"),
        thumbnail_url: format!("https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"),
        live: true,
    }
}

fn safe_end(value: &str, mut end: usize) -> usize {
    end = end.min(value.len());
    while end > 0 && !value.is_char_boundary(end) {
        end -= 1;
    }
    end
}

/// VGC is the game we follow. GO/TCG/Trading Card broadcasts share the same
/// channel and often the same event name, so reject those explicitly.
fn is_vgc_title(title: &str) -> bool {
    let lower = title.to_lowercase();
    if lower.contains("pokémon go")
        || lower.contains("pokemon go")
        || lower.starts_with("go day")
        || lower.contains("go day")
        || lower.contains(" tcg")
        || lower.contains("tcg ")
        || lower.starts_with("tcg")
        || lower.contains("trading card")
    {
        return false;
    }
    lower.contains("vgc")
        || lower.contains("pokémon champions")
        || lower.contains("pokemon champions")
}

fn unescape_title(raw: &str) -> String {
    let mut out = String::with_capacity(raw.len());
    let mut chars = raw.chars();
    while let Some(ch) = chars.next() {
        if ch != '\\' {
            out.push(ch);
            continue;
        }
        match chars.next() {
            Some('"') => out.push('"'),
            Some('\\') => out.push('\\'),
            Some('/') => out.push('/'),
            Some('n') | Some('t') | Some('r') => out.push(' '),
            Some('u') => {
                let hex: String = chars.by_ref().take(4).collect();
                if let Ok(code) = u32::from_str_radix(&hex, 16) {
                    if let Some(ch) = char::from_u32(code) {
                        out.push(ch);
                    }
                }
            }
            Some(other) => out.push(other),
            None => break,
        }
    }
    out.trim().to_string()
}

/// Live status of the main video on a watch page. Only the requested video is
/// accepted; related videos are ignored.
fn parse_watch_page_live(html: &str, expected_video_id: &str) -> Option<OfficialLiveStream> {
    let re = Regex::new(
        r#"(?s)"videoDetails":\{"videoId":"([A-Za-z0-9_-]{11})","title":"((?:[^"\\]|\\.)*)".{0,4000}?"isLive":(true|false)"#,
    )
    .ok()?;
    let capture = re.captures(html)?;
    if capture.get(1)?.as_str() != expected_video_id || capture.get(3)?.as_str() != "true" {
        return None;
    }
    Some(stream(
        capture.get(1)?.as_str(),
        unescape_title(capture.get(2)?.as_str()),
    ))
}

/// Live VGC entry from the channel `/streams` tab. The page renders cards as
/// `lockupMetadataViewModel`; live ones show "N watching" while past streams
/// show "Streamed ... ago".
fn parse_streams_page(html: &str, vgc_only: bool, want_live: bool) -> Option<OfficialLiveStream> {
    let marker = "\"lockupMetadataViewModel\"";
    let positions: Vec<usize> = html
        .match_indices(marker)
        .map(|(position, _)| position)
        .collect();
    let title_re = Regex::new(r#""title":\{"content":"((?:[^"\\]|\\.)*)""#).ok()?;
    let id_re = Regex::new(r#""watchEndpoint":\{"videoId":"([A-Za-z0-9_-]{11})""#).ok()?;

    let mut best: Option<(u8, OfficialLiveStream)> = None;
    for (index, position) in positions.iter().enumerate() {
        let raw_end = positions
            .get(index + 1)
            .copied()
            .unwrap_or_else(|| position.saturating_add(60_000));
        let end = safe_end(html, raw_end);
        let Some(segment) = html.get(*position..end) else {
            continue;
        };
        let Some(title) = title_re
            .captures(segment)
            .and_then(|capture| capture.get(1))
            .map(|capture| unescape_title(capture.as_str()))
        else {
            continue;
        };
        if vgc_only && !is_vgc_title(&title) {
            continue;
        }
        let live = segment.contains("watching")
            || segment.contains("\"isLive\":true")
            || segment.contains("BADGE_STYLE_TYPE_LIVE_NOW")
            || segment.contains("\"label\":\"LIVE\"");
        if live != want_live {
            continue;
        }
        let Some(video_id) = id_re
            .captures(segment)
            .and_then(|capture| capture.get(1))
            .map(|capture| capture.as_str().to_string())
        else {
            continue;
        };
        // Live cards are ordered by preference (VGC first). Past cards are
        // ordered newest-first by YouTube, so the first match IS the latest
        // broadcast; scoring them would resurrect an older VGC stream.
        let score = if want_live && title.to_lowercase().contains("vgc") {
            2
        } else {
            1
        };
        let better = if want_live {
            best.as_ref()
                .map(|(current, _)| score > *current)
                .unwrap_or(true)
        } else {
            best.is_none()
        };
        if better {
            let mut candidate = stream(&video_id, title);
            candidate.live = want_live;
            best = Some((score, candidate));
        }
    }
    best.map(|(_, stream)| stream)
}

/// Fallback for the channel `/live` page: collect live cards and keep the VGC
/// one. A GO stream in first position is never returned for the official
/// channel; community screens accept the first live card.
fn parse_live_page(html: &str, vgc_only: bool) -> Option<OfficialLiveStream> {
    live_candidates(html)
        .into_iter()
        .find(|candidate| !vgc_only || is_vgc_title(&candidate.title))
}

fn live_candidates(html: &str) -> Vec<OfficialLiveStream> {
    let Some(title_re) = Regex::new(r#""title":\{"runs":\[\{"text":"([^"]+)""#).ok() else {
        return Vec::new();
    };
    let Some(simple_title_re) = Regex::new(r#""title":\{"simpleText":"([^"]+)""#).ok() else {
        return Vec::new();
    };
    let Some(headline_re) = Regex::new(r#""headline":\{"runs":\[\{"text":"([^"]+)""#).ok() else {
        return Vec::new();
    };
    let Some(id_re) = Regex::new(r#""videoId":"([A-Za-z0-9_-]{11})""#).ok() else {
        return Vec::new();
    };
    let Some(primary_re) = Regex::new(
        r#"(?s)"videoDetails":\{"videoId":"([A-Za-z0-9_-]{11})","title":"((?:[^"\\]|\\.)*)".{0,2000}?"isLive":true"#,
    )
    .ok()
    else {
        return Vec::new();
    };
    let live_marker = |window: &str| {
        window.contains("\"isLive\":true")
            || window.contains("\"isLiveNow\":true")
            || window.contains("BADGE_STYLE_TYPE_LIVE_NOW")
            || window.contains("\"label\":\"LIVE\"")
    };

    let mut out: Vec<OfficialLiveStream> = Vec::new();
    let push = |out: &mut Vec<OfficialLiveStream>, candidate: OfficialLiveStream| {
        if !out
            .iter()
            .any(|existing| existing.video_id == candidate.video_id)
        {
            out.push(candidate);
        }
    };
    let mut titles: Vec<(usize, String)> = Vec::new();
    for regex in [&title_re, &simple_title_re, &headline_re] {
        for capture in regex.captures_iter(html) {
            let Some(whole) = capture.get(0) else {
                continue;
            };
            let title = capture
                .get(1)
                .map(|value| value.as_str().trim().to_string())
                .unwrap_or_default();
            if title.is_empty() || title.contains("video?") {
                continue;
            }
            titles.push((whole.start(), title));
        }
    }
    titles.sort_by_key(|(position, _)| *position);

    // The main player is the strongest signal and has an unescaped title.
    if let Some(capture) = primary_re.captures(html) {
        if let Some(title) = capture.get(2) {
            push(
                &mut out,
                stream(
                    capture.get(1).map(|m| m.as_str()).unwrap_or_default(),
                    unescape_title(title.as_str()),
                ),
            );
        }
    }

    for capture in id_re.captures_iter(html) {
        let Some(id_match) = capture.get(1) else {
            continue;
        };
        let video_id = id_match.as_str().to_string();
        if out.iter().any(|existing| existing.video_id == video_id) {
            continue;
        }
        let tail: String = html[id_match.end()..].chars().take(4000).collect();
        if !live_marker(&tail) {
            continue;
        }
        let title = title_re
            .captures(&tail)
            .or_else(|| simple_title_re.captures(&tail))
            .or_else(|| headline_re.captures(&tail))
            .and_then(|capture| capture.get(1))
            .map(|capture| capture.as_str().trim().to_string())
            .filter(|title| !title.is_empty() && !title.contains("video?"))
            .or_else(|| {
                titles
                    .iter()
                    .filter(|(position, _)| {
                        (*position as isize - id_match.start() as isize).unsigned_abs() < 3000
                    })
                    .min_by_key(|(position, _)| {
                        (*position as isize - id_match.start() as isize).unsigned_abs()
                    })
                    .map(|(_, title)| title.clone())
            });
        let Some(title) = title else { continue };
        push(&mut out, stream(&video_id, title));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    const PAGE: &str = r#"
      "videoId":"unOIiKSwKVk"
      "title":{"runs":[{"text":"GO Day 2 | 2027 Pokémon Latin America International Championships"}]}
      "isLive":true
      "videoId":"2_l7hdlAs6E"
      "title":{"runs":[{"text":"VGC Day 2 | 2027 Pokémon Latin America International Championships"}]}
      "isLive":true
    "#;

    #[test]
    fn prefers_the_vgc_stream_over_other_games() {
        let stream = parse_live_page(PAGE, true).unwrap();
        assert_eq!(stream.video_id, "2_l7hdlAs6E");
        assert!(stream.title.contains("VGC"));
        assert_eq!(
            stream.embed_url,
            "https://www.youtube-nocookie.com/embed/2_l7hdlAs6E"
        );
    }

    #[test]
    fn ignores_a_go_only_live_page_for_the_official_channel() {
        let page = r#"
          "videoId":"unOIiKSwKVk"
          "title":{"runs":[{"text":"GO Day 2 | 2027 Pokémon Latin America International Championships"}]}
          "isLive":true
        "#;
        assert!(parse_live_page(page, true).is_none());
        // A community screen accepts whatever it is broadcasting.
        assert!(parse_live_page(page, false).is_some());
    }

    #[test]
    fn returns_none_for_a_page_without_video_ids() {
        assert!(parse_live_page("<html>not live</html>", true).is_none());
    }

    #[test]
    fn ignores_past_videos() {
        let page = r#"
          "videoId":"2_l7hdlAs6E"
          "title":{"runs":[{"text":"VGC Day 2 | 2027 Pokémon Latin America International Championships"}]}
          "isLive":false
        "#;
        assert!(parse_live_page(page, true).is_none());
    }

    #[test]
    fn resolves_handles_channels_and_video_urls() {
        assert_eq!(resolve_source(None), "https://www.youtube.com/@PlayPokemon");
        assert_eq!(
            resolve_source(Some("@PlayPokemon")),
            "https://www.youtube.com/@PlayPokemon"
        );
        assert_eq!(
            resolve_source(Some("www.youtube.com/@PlayPokemon/live")),
            "https://www.youtube.com/@PlayPokemon/live"
        );
        assert_eq!(
            youtube_video_id("https://www.youtube.com/watch?v=2_l7hdlAs6E"),
            Some("2_l7hdlAs6E".into())
        );
        assert_eq!(
            youtube_video_id("https://youtu.be/2_l7hdlAs6E"),
            Some("2_l7hdlAs6E".into())
        );
        assert_eq!(
            youtube_video_id("https://www.youtube.com/live/2_l7hdlAs6E"),
            Some("2_l7hdlAs6E".into())
        );
    }

    #[test]
    fn builds_the_streams_and_live_urls_from_a_channel() {
        assert_eq!(
            channel_streams_url("https://www.youtube.com/@PlayPokemon/live"),
            "https://www.youtube.com/@PlayPokemon/streams"
        );
        assert_eq!(
            channel_live_url("https://www.youtube.com/@PlayPokemon/streams"),
            "https://www.youtube.com/@PlayPokemon/live"
        );
    }

    #[test]
    fn reads_a_headline_placed_before_the_video_id() {
        let page = r#"
          "headline":{"runs":[{"text":"VGC Day 2 | 2027 Pokémon Latin America International Championships"}]}
          "thumbnail":{"thumbnails":[]}
          "videoId":"2_l7hdlAs6E"
          "isLive":true
        "#;
        let stream = parse_live_page(page, true).unwrap();
        assert_eq!(stream.video_id, "2_l7hdlAs6E");
        assert!(stream.title.contains("VGC"));
    }

    #[test]
    fn verifies_that_an_explicit_video_is_still_live() {
        let live = r#"
          "videoDetails":{"videoId":"2_l7hdlAs6E","title":"VGC Day 2 | 2027 Pokémon Latin America International Championships","lengthSeconds":"0","isLive":true}
        "#;
        assert!(parse_watch_page_live(live, "2_l7hdlAs6E").is_some());

        let past = r#"
          "videoDetails":{"videoId":"2_l7hdlAs6E","title":"VGC Day 2 | 2027 Pokémon Latin America International Championships","lengthSeconds":"0","isLive":false}
        "#;
        assert!(parse_watch_page_live(past, "2_l7hdlAs6E").is_none());
    }

    #[test]
    fn reads_the_streams_tab_and_prefers_the_live_vgc_card() {
        let page = r#"
          "lockupMetadataViewModel":{"title":{"content":"VGC Day 2 | 2027 Pokémon Latin America International Championships"},"metadata":{"contentMetadataViewModel":{"metadataRows":[{"metadataParts":[{"text":{"content":"4.1K watching"}}]}]}}}
          "watchEndpoint":{"videoId":"2_l7hdlAs6E"}
          "lockupMetadataViewModel":{"title":{"content":"GO Day 2 | 2027 Pokémon Latin America International Championships"},"metadata":{"contentMetadataViewModel":{"metadataRows":[{"metadataParts":[{"text":{"content":"3.2K watching"}}]}]}}}
          "watchEndpoint":{"videoId":"unOIiKSwKVk"}
          "lockupMetadataViewModel":{"title":{"content":"VGC Day 1 | 2027 Pokémon Latin America International Championships"},"metadata":{"contentMetadataViewModel":{"metadataRows":[{"metadataParts":[{"text":{"content":"168K"}},{"text":{"content":"Streamed 20h ago"}}]}]}}}
          "watchEndpoint":{"videoId":"McqT0f8VAXY"}
        "#;
        let stream = parse_streams_page(page, true, true).unwrap();
        assert_eq!(stream.video_id, "2_l7hdlAs6E");
        assert!(stream.title.contains("VGC"));
        assert!(!stream.title.contains("GO"));

        let recent = parse_streams_page(page, true, false).unwrap();
        assert_eq!(recent.video_id, "McqT0f8VAXY");
        assert!(!recent.live);
    }
}
