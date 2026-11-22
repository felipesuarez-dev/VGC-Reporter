use crate::adapters::HttpClient;
use crate::config;
use crate::error::AppError;
use serde::Deserialize;
use std::sync::Arc;

const TEAMS_URL: &str = "https://pokebase.app/pokemon-champions/teams";
const HEADERS: &[(&str, &str)] = &[
    (
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 \
         (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    ),
    ("Accept-Language", "en-US,en;q=0.9"),
];

/// Read-only client for PokéBase's public Champions team showcase.
///
/// PokéBase does not expose a documented public API for this page and
/// robots.txt disallows `/api`, so the page itself is the source. Next.js
/// embeds the server payload as an RSC script; we decode that string and
/// parse the `showcase` object. Cached for 12h to keep requests polite.
#[derive(Clone)]
pub struct PokebaseClient {
    http: Arc<HttpClient>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PokebaseTeamCard {
    pub id: String,
    #[serde(default)]
    pub top: Option<PokebaseTop>,
    #[serde(default)]
    pub tournament: Option<PokebaseTournament>,
    #[serde(default)]
    pub country: Option<String>,
    #[serde(default)]
    pub display_name: Option<String>,
    #[serde(default, rename = "displayName")]
    pub display_name_camel: Option<String>,
    #[serde(default)]
    pub source_url: Option<String>,
    #[serde(default, rename = "sourceUrl")]
    pub source_url_camel: Option<String>,
    #[serde(default)]
    pub date_shared: Option<String>,
    #[serde(default, rename = "dateShared")]
    pub date_shared_camel: Option<String>,
}

impl PokebaseTeamCard {
    pub fn player(&self) -> Option<String> {
        self.display_name
            .clone()
            .or_else(|| self.display_name_camel.clone())
            .or_else(|| {
                self.top
                    .as_ref()
                    .and_then(|top| top.player_display_name.clone())
            })
    }
    pub fn source(&self) -> Option<String> {
        self.source_url
            .clone()
            .or_else(|| self.source_url_camel.clone())
    }
    pub fn shared_at(&self) -> Option<String> {
        self.date_shared
            .clone()
            .or_else(|| self.date_shared_camel.clone())
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct PokebaseTop {
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default, rename = "playerDisplayName")]
    pub player_display_name: Option<String>,
    #[serde(default)]
    pub placing: Option<u32>,
    #[serde(default)]
    pub wins: Option<u32>,
    #[serde(default)]
    pub losses: Option<u32>,
    #[serde(default)]
    pub ties: Option<u32>,
    #[serde(default)]
    pub pokemon: Vec<PokebasePokemon>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PokebaseTournament {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub date: Option<String>,
    #[serde(default, rename = "numberOfPlayers")]
    pub number_of_players: Option<u32>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PokebasePokemon {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub slug: String,
    #[serde(default, rename = "iconUrl")]
    pub icon_url: Option<String>,
    #[serde(default)]
    pub types: Vec<String>,
    #[serde(default)]
    pub item: Option<String>,
    #[serde(default, rename = "itemIconUrl")]
    pub item_icon_url: Option<String>,
    #[serde(default)]
    pub moves: Vec<PokebaseMove>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PokebaseMove {
    #[serde(default)]
    pub slug: String,
}

#[derive(Debug, Clone, Default)]
pub struct PokebasePage {
    pub community: Vec<PokebaseTeamCard>,
    pub tournament: Vec<PokebaseTeamCard>,
    pub community_total: u32,
    pub tournament_total: u32,
}

#[derive(Debug, Deserialize)]
struct ShowcasePayload {
    #[serde(default)]
    community: Vec<PokebaseTeamCard>,
    #[serde(default)]
    tournament: Vec<PokebaseTeamCard>,
    #[serde(default, rename = "communityTotal")]
    community_total: u32,
    #[serde(default, rename = "tournamentTotal")]
    tournament_total: u32,
}

impl PokebaseClient {
    pub fn new(http: Arc<HttpClient>) -> Self {
        Self { http }
    }

    pub async fn teams(&self, page: u32) -> Result<PokebasePage, AppError> {
        let url = format!("{TEAMS_URL}?cPage={page}&tPage={page}",);
        let bytes = self
            .http
            .get_cached_with_headers(&url, HEADERS, config::TTL_POKEBASE)
            .await?;
        let html = String::from_utf8_lossy(&bytes);
        parse_page(&html)
    }
}

fn parse_page(html: &str) -> Result<PokebasePage, AppError> {
    let payload = extract_showcase(html)
        .ok_or_else(|| AppError::Validation("PokéBase page has no showcase payload".into()))?;
    let parsed: ShowcasePayload = serde_json::from_str(&payload)?;
    Ok(PokebasePage {
        community: parsed.community,
        tournament: parsed.tournament,
        community_total: parsed.community_total,
        tournament_total: parsed.tournament_total,
    })
}

/// Decode the RSC script containing `"showcase"` and return that JSON object.
fn extract_showcase(html: &str) -> Option<String> {
    let marker = "self.__next_f.push([1,";
    let mut search = html;
    while let Some(index) = search.find(marker) {
        let rest = &search[index + marker.len()..];
        let end = rest.find("])</script>")?;
        let literal = &rest[..end];
        // The push argument is a JS string literal; serde_json can decode the
        // JSON-compatible escaping used by Next.js.
        if let Ok(decoded) = serde_json::from_str::<String>(literal) {
            if let Some(showcase) = decoded.find("\"showcase\":") {
                let object_start = decoded[showcase..].find('{')? + showcase;
                if let Some(object) = balanced_object(&decoded, object_start) {
                    return Some(object);
                }
            }
        }
        search = &search[index + marker.len()..];
    }
    None
}

fn balanced_object(value: &str, start: usize) -> Option<String> {
    let mut depth = 0usize;
    let mut in_string = false;
    let mut escaped = false;
    for (offset, ch) in value[start..].char_indices() {
        if in_string {
            if escaped {
                escaped = false;
            } else if ch == '\\' {
                escaped = true;
            } else if ch == '"' {
                in_string = false;
            }
            continue;
        }
        match ch {
            '"' => in_string = true,
            '{' => depth += 1,
            '}' => {
                depth = depth.saturating_sub(1);
                if depth == 0 {
                    return Some(value[start..start + offset + 1].to_string());
                }
            }
            _ => {}
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_the_showcase_object_from_an_rsc_payload() {
        let payload = r#"{\"showcase\":{\"communityTotal\":2419,\"community\":[{\"id\":\"abc\",\"top\":{\"pokemon\":[{\"name\":\"Pelipper\",\"slug\":\"pelipper\",\"item\":\"Focus Sash\",\"moves\":[{\"slug\":\"tailwind\"}]}]},\"displayName\":\"Ash\"}],\"tournament\":[],\"tournamentTotal\":66972}}"#;
        let html = format!("<script>self.__next_f.push([1,\"{payload}\"])</script>");
        let page = parse_page(&html).expect("payload");
        assert_eq!(page.community_total, 2419);
        assert_eq!(page.community[0].player().as_deref(), Some("Ash"));
        assert_eq!(
            page.community[0].top.as_ref().unwrap().pokemon[0].slug,
            "pelipper"
        );
    }

    #[test]
    fn rejects_a_page_without_payload() {
        assert!(parse_page("<html>no rsc</html>").is_err());
    }
}
