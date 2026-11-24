use crate::adapters::HttpClient;
use crate::config;
use crate::domain::event_match::{event_match_score, parse_listing_date};
use crate::error::AppError;
use chrono::NaiveDate;
use scraper::{Html, Selector};
use serde::Deserialize;
use std::sync::Arc;

const TEAMS_URL: &str = "https://pokebase.app/pokemon-champions/teams";
const TOURNAMENTS_URL: &str = "https://pokebase.app/pokemon-champions/tournaments";
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
        let value = self
            .source_url
            .clone()
            .or_else(|| self.source_url_camel.clone())?;
        let trimmed = value.trim();
        if trimmed.is_empty() {
            None
        } else if trimmed.starts_with('/') {
            // PokéBase sometimes stores the attribution as a local path.
            Some(format!("https://pokebase.app{trimmed}"))
        } else if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
            Some(trimmed.to_string())
        } else {
            None
        }
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

#[derive(Debug, Clone, PartialEq)]
pub struct PokebaseTournamentRef {
    pub id: String,
    pub name: String,
    pub date: Option<NaiveDate>,
    pub url: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PokebaseTeamPokemon {
    pub name: String,
    pub item: Option<String>,
    pub sprite_url: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PokebaseTournamentTeam {
    pub placing: Option<u32>,
    pub placing_label: Option<String>,
    pub player_name: String,
    pub country: Option<String>,
    pub record: Option<String>,
    pub pokemon: Vec<PokebaseTeamPokemon>,
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

    /// Find the PokéBase tournament page that matches an official event. The
    /// same event is named differently on each site, so the comparison uses
    /// date, type, region and normalised tokens (see `domain::event_match`).
    pub async fn find_tournament(
        &self,
        name: &str,
        date: Option<NaiveDate>,
    ) -> Result<Option<PokebaseTournamentRef>, AppError> {
        let bytes = self
            .http
            .get_cached_with_headers(TOURNAMENTS_URL, HEADERS, config::TTL_POKEBASE)
            .await?;
        let html = String::from_utf8_lossy(&bytes);
        Ok(parse_tournament_list(&html, name, date))
    }

    /// Top-cut teams from a PokéBase tournament page. The official event feed
    /// has no decklists; this is the public community enrichment.
    pub async fn tournament_top8(&self, id: &str) -> Result<Vec<PokebaseTournamentTeam>, AppError> {
        if id.is_empty() || !id.chars().all(|character| character.is_ascii_hexdigit()) {
            return Err(AppError::Validation(
                "invalid PokéBase tournament id".into(),
            ));
        }
        let url = format!("{TOURNAMENTS_URL}/{id}");
        let bytes = self
            .http
            .get_cached_with_headers(&url, HEADERS, config::TTL_POKEBASE)
            .await?;
        let html = String::from_utf8_lossy(&bytes);
        Ok(parse_tournament_teams(&html))
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

fn parse_tournament_list(
    html: &str,
    name: &str,
    date: Option<NaiveDate>,
) -> Option<PokebaseTournamentRef> {
    let document = Html::parse_document(html);
    let selector = Selector::parse(r#"a[href^="/pokemon-champions/tournaments/"]"#).ok()?;
    let mut best: Option<(i32, PokebaseTournamentRef)> = None;
    let mut seen = std::collections::HashSet::new();
    for anchor in document.select(&selector) {
        let href = anchor.value().attr("href")?.trim_end_matches('/');
        let Some(id) = href
            .strip_prefix("/pokemon-champions/tournaments/")
            .filter(|id| id.len() >= 16 && id.chars().all(|c| c.is_ascii_hexdigit()))
        else {
            continue;
        };
        if !seen.insert(id.to_string()) {
            continue;
        }
        let Some(label) = anchor.value().attr("aria-label") else {
            continue;
        };
        let Some((event_name, event_date)) = split_listing_label(label) else {
            continue;
        };
        let event_name = event_name.trim();
        if event_name.is_empty() || is_tcg_name(event_name) {
            continue;
        }
        let Some(score) = event_match_score(name, date, event_name, Some(event_date)) else {
            continue;
        };
        if score < 6 {
            continue;
        }
        let exact_date = date.is_some() && date == Some(event_date);
        let score = score + if exact_date { 2 } else { 0 };
        if best
            .as_ref()
            .map_or(true, |(best_score, _)| score > *best_score)
        {
            best = Some((
                score,
                PokebaseTournamentRef {
                    id: id.to_string(),
                    name: event_name.to_string(),
                    date: Some(event_date),
                    url: format!("{TOURNAMENTS_URL}/{id}"),
                },
            ));
        }
    }
    best.map(|(_, tournament)| tournament)
}

fn split_listing_label(label: &str) -> Option<(&str, NaiveDate)> {
    for (index, _) in label.match_indices(", ") {
        let candidate = &label[index + 2..];
        if let Some(date) = parse_listing_date(candidate) {
            return Some((&label[..index], date));
        }
    }
    None
}

fn is_tcg_name(name: &str) -> bool {
    let lower = name.to_lowercase();
    lower.contains("tcg") || lower.contains("trading card")
}

fn parse_tournament_teams(html: &str) -> Vec<PokebaseTournamentTeam> {
    let document = Html::parse_document(html);
    let Ok(list_selector) = Selector::parse(r#"ol[aria-label="Top 8"] > li"#) else {
        return Vec::new();
    };
    let Ok(button_selector) = Selector::parse("button[aria-label]") else {
        return Vec::new();
    };
    let Ok(notch_selector) = Selector::parse(r#"span[aria-hidden="true"]"#) else {
        return Vec::new();
    };
    let Ok(country_selector) = Selector::parse("span[title]") else {
        return Vec::new();
    };
    let Ok(pokemon_selector) = Selector::parse("ul li[title]") else {
        return Vec::new();
    };
    let Ok(image_selector) = Selector::parse("img") else {
        return Vec::new();
    };
    document
        .select(&list_selector)
        .enumerate()
        .filter_map(|(index, row)| {
            let raw_label = row
                .select(&button_selector)
                .next()
                .and_then(|button| button.value().attr("aria-label"))?;
            let (player_name, parsed_placing, record) = parse_team_label(raw_label)?;
            let notch = row
                .select(&notch_selector)
                .next()
                .map(|span| span.text().collect::<String>().trim().to_string())
                .filter(|label| !label.is_empty());
            let placing_label = notch.or_else(|| parsed_placing.clone());
            let placing = parsed_placing
                .as_deref()
                .and_then(parse_placing)
                .or_else(|| Some(index as u32 + 1));
            let country = row
                .select(&country_selector)
                .next()
                .and_then(|span| span.value().attr("title"))
                .map(str::trim)
                .filter(|code| code.len() == 2 && code.chars().all(|c| c.is_ascii_alphabetic()))
                .map(str::to_uppercase);
            let pokemon = row
                .select(&pokemon_selector)
                .filter_map(|slot| {
                    let title = slot.value().attr("title")?.trim();
                    if title.is_empty() {
                        return None;
                    }
                    let (name, item) = title
                        .rsplit_once(" @ ")
                        .map(|(name, item)| (name.trim(), Some(item.trim().to_string())))
                        .unwrap_or((title, None));
                    let sprite_url = slot
                        .select(&image_selector)
                        .next()
                        .and_then(|image| image.value().attr("src"))?
                        .to_string();
                    Some(PokebaseTeamPokemon {
                        name: name.to_string(),
                        item,
                        sprite_url,
                    })
                })
                .collect::<Vec<_>>();
            if pokemon.is_empty() {
                return None;
            }
            Some(PokebaseTournamentTeam {
                placing,
                placing_label,
                player_name,
                country,
                record,
                pokemon,
            })
        })
        .collect()
}

fn parse_team_label(raw: &str) -> Option<(String, Option<String>, Option<String>)> {
    let rest = raw.strip_prefix("View ").unwrap_or(raw);
    let (player, tail) = rest.rsplit_once("'s team, ")?;
    let mut parts = tail.split(',').map(str::trim);
    let placing = parts.next().filter(|value| !value.is_empty());
    let record = parts
        .next()
        .filter(|value| {
            value.contains('-') && value.chars().all(|c| c.is_ascii_digit() || c == '-')
        })
        .map(str::to_string);
    let player = player.trim();
    if player.is_empty() {
        return None;
    }
    Some((player.to_string(), placing.map(str::to_string), record))
}

fn parse_placing(raw: &str) -> Option<u32> {
    let lower = raw.trim().to_lowercase();
    if lower == "champion" {
        return Some(1);
    }
    let digits = lower
        .chars()
        .take_while(|character| character.is_ascii_digit())
        .collect::<String>();
    digits.parse::<u32>().ok().filter(|place| *place > 0)
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

    #[test]
    fn resolves_relative_attribution_paths() {
        let card = PokebaseTeamCard {
            id: "abc".into(),
            top: None,
            tournament: None,
            country: None,
            display_name: None,
            display_name_camel: None,
            source_url: Some("/trainer/ash".into()),
            source_url_camel: None,
            date_shared: None,
            date_shared_camel: None,
        };
        assert_eq!(
            card.source().as_deref(),
            Some("https://pokebase.app/trainer/ash")
        );
    }

    #[test]
    fn finds_laic_by_date_and_rejects_tcg() {
        let html = r#"
        <a aria-label="2027 Latin America Pokémon TCG International Championships, Nov 20, 2026" href="/pokemon-champions/tournaments/aaaaaaaaaaaaaaaaaaaaaaaa"></a>
        <a aria-label="2027 Latin America Pokémon VGC International Championships, Nov 20, 2026" href="/pokemon-champions/tournaments/bbbbbbbbbbbbbbbbbbbbbbbb"></a>
        <a aria-label="2027 Louisville Pokémon VGC Regional Championships, Oct 9, 2026" href="/pokemon-champions/tournaments/cccccccccccccccccccccccc"></a>
        "#;
        let tournament = parse_tournament_list(
            html,
            "2027 Pokémon Latin America International Championships",
            NaiveDate::from_ymd_opt(2026, 11, 20),
        )
        .expect("LAIC");
        assert_eq!(
            parse_listing_date("Nov 20, 2026"),
            NaiveDate::from_ymd_opt(2026, 11, 20)
        );
        assert_eq!(tournament.id, "bbbbbbbbbbbbbbbbbbbbbbbb");
        assert_eq!(tournament.date, NaiveDate::from_ymd_opt(2026, 11, 20));
        assert!(tournament.url.ends_with("/bbbbbbbbbbbbbbbbbbbbbbbb"));
    }

    #[test]
    fn parses_top8_players_countries_records_and_teams() {
        let html = r#"
        <ol aria-label="Top 8">
          <li>
            <button aria-label="View Masahiro Taoka&#x27;s team, champion, 14-2"></button>
            <span aria-hidden="true">1st</span>
            <p><span title="JP">JP</span></p>
            <ul>
              <li title="Swampert @ Swampertite"><img src="https://img.pokebase.app/swampert.png"></li>
              <li title="Incineroar @ Passho Berry"><img src="https://img.pokebase.app/incineroar.png"></li>
            </ul>
          </li>
          <li>
            <button aria-label="View Emilio Forbes&#x27;s team, 2nd, 14-2"></button>
            <span aria-hidden="true">2nd</span>
            <p><span title="US">US</span></p>
            <ul>
              <li title="Gengar @ Gengarite"><img src="https://img.pokebase.app/gengar.png"></li>
            </ul>
          </li>
        </ol>
        "#;
        let teams = parse_tournament_teams(html);
        assert_eq!(teams.len(), 2);
        assert_eq!(teams[0].placing, Some(1));
        assert_eq!(teams[0].placing_label.as_deref(), Some("1st"));
        assert_eq!(teams[0].player_name, "Masahiro Taoka");
        assert_eq!(teams[0].country.as_deref(), Some("JP"));
        assert_eq!(teams[0].record.as_deref(), Some("14-2"));
        assert_eq!(teams[0].pokemon.len(), 2);
        assert_eq!(teams[0].pokemon[0].name, "Swampert");
        assert_eq!(teams[0].pokemon[0].item.as_deref(), Some("Swampertite"));
        assert_eq!(teams[1].placing, Some(2));
        assert_eq!(teams[1].player_name, "Emilio Forbes");
    }
}
