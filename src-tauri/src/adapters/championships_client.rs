use crate::adapters::HttpClient;
use crate::config;
use crate::error::AppError;
use chrono::{Datelike, NaiveDate};
use regex::Regex;
use serde::Deserialize;
use serde_json::Value;
use std::sync::Arc;

/// The official Championship Series calendar is a public list endpoint backed
/// by the championships.pokemon.com site. It is the only source that carries
/// Internationals, Regionals, Specials and Worlds; the local event mirror only
/// knows League Challenges and Cups.
const BASE: &str = "https://championships.pokemon.com";
const EVENTS_API: &str = "https://championships.pokemon.com/api/events.json?locale=en-us";
const RESULTS_API: &str = "https://championships.pokemon.com/api/1/services/results.json";

const BROWSER_HEADERS: &[(&str, &str)] = &[
    (
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 \
         (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    ),
    ("Accept-Language", "en-US,en;q=0.9"),
];

#[derive(Clone)]
pub struct ChampionshipsClient {
    http: Arc<HttpClient>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ChampionshipEvent {
    pub id: String,
    pub name: String,
    pub url: String,
    /// Raw location from the official calendar, e.g. "São Paulo, Brazil".
    pub location: String,
    pub city: Option<String>,
    pub country: Option<String>,
    /// `world`, `international`, `regional` or `special`.
    pub type_code: String,
    pub region: Option<String>,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    /// Prize pool text as published by the organizer, e.g. "$500,000 USD".
    pub prize_pool: Option<String>,
    pub winner_name: Option<String>,
    pub winner_country: Option<String>,
    pub players: Option<u32>,
}

#[derive(Debug, Clone, Default, PartialEq)]
pub struct ChampionshipDetails {
    pub prize_pool: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ChampionshipWinner {
    pub name: String,
    pub country: Option<String>,
    pub players: Option<u32>,
}

impl ChampionshipsClient {
    pub fn new(http: Arc<HttpClient>) -> Self {
        Self { http }
    }

    /// `completed = false` returns the upcoming calendar; `true` returns past
    /// events. Items are sorted by start date (ascending for upcoming,
    /// descending for completed).
    pub async fn list(&self, completed: bool) -> Result<Vec<ChampionshipEvent>, AppError> {
        let status = if completed { "completed" } else { "upcoming" };
        let url = format!("{EVENTS_API}&status={status}");
        let response: EventsResponse = self
            .http
            .get_json(&url, config::TTL_OFFICIAL_MAJORS)
            .await?;
        let today = chrono::Utc::now().date_naive();
        let mut events = response
            .items
            .into_iter()
            .filter_map(|item| item.into_event(today))
            .collect::<Vec<_>>();
        events.sort_by(|a, b| {
            if completed {
                b.start_date.cmp(&a.start_date)
            } else {
                a.start_date.cmp(&b.start_date)
            }
        });
        Ok(events)
    }

    /// Reads the official detail page and keeps the cash prize pool when the
    /// organizer published one. Best effort: some events only show trophies,
    /// scholarships or no prizing section at all.
    pub async fn details(&self, url: &str) -> Result<ChampionshipDetails, AppError> {
        let bytes = self
            .http
            .get_cached_with_headers(url, BROWSER_HEADERS, config::TTL_OFFICIAL_MAJOR_DETAIL)
            .await?;
        let html = String::from_utf8_lossy(&bytes);
        Ok(ChampionshipDetails {
            prize_pool: prize_pool_from_html(&html),
        })
    }

    /// Final Masters VGC winner and player count from the official results
    /// endpoint. Returns `None` while an event has no published results.
    pub async fn winner(&self, event_url: &str) -> Result<Option<ChampionshipWinner>, AppError> {
        let path = event_url
            .strip_prefix(BASE)
            .filter(|path| path.starts_with('/'))
            .unwrap_or(event_url);
        let url = format!(
            "{RESULTS_API}?game=vg&division=masters&locale=en-us&url={}&start=0&size=5",
            urlencoding::encode(path)
        );
        let response: ResultsResponse = self
            .http
            .get_json(&url, config::TTL_OFFICIAL_MAJOR_DETAIL)
            .await?;
        let player = response
            .players
            .iter()
            .find(|player| player.place == Some(1))
            .or_else(|| response.players.first());
        let Some(display_name) = player.and_then(|player| player.display_name.clone()) else {
            return Ok(None);
        };
        let (name, country) = split_country(&display_name);
        if name.is_empty() {
            return Ok(None);
        }
        Ok(Some(ChampionshipWinner {
            name,
            country,
            players: response.total_count,
        }))
    }

    /// Enriches a calendar item with the data that lives on the event page:
    /// the published prize pool and the current/final Masters winner.
    pub async fn enrich(&self, event: &mut ChampionshipEvent) {
        let (details, winner) = tokio::join!(self.details(&event.url), self.winner(&event.url));
        match details {
            Ok(details) => {
                if details.prize_pool.is_some() {
                    event.prize_pool = details.prize_pool;
                }
            }
            Err(error) => {
                tracing::debug!(%error, url = %event.url, "official event details unavailable")
            }
        }
        match winner {
            Ok(Some(winner)) => {
                event.winner_name = Some(winner.name);
                event.winner_country = winner.country;
                if winner.players.is_some() {
                    event.players = winner.players;
                }
            }
            Ok(None) => {}
            Err(error) => {
                tracing::debug!(%error, url = %event.url, "official event results unavailable")
            }
        }
    }
}

#[derive(Debug, Deserialize)]
struct EventsResponse {
    #[serde(default)]
    items: Vec<RawEvent>,
}

#[derive(Debug, Deserialize)]
struct RawEvent {
    #[serde(rename = "eventName_s", default)]
    name: String,
    #[serde(rename = "uRL_s", default)]
    url: String,
    #[serde(rename = "displayDateRange_s", default)]
    display_date_range: String,
    #[serde(rename = "type_s", default)]
    type_code: String,
    #[serde(rename = "region_s", default)]
    region: Option<String>,
    #[serde(rename = "year_s", default)]
    year: Option<String>,
    #[serde(rename = "eventLocation_s", default)]
    location: Option<String>,
}

impl RawEvent {
    fn into_event(self, today: NaiveDate) -> Option<ChampionshipEvent> {
        let mut type_code = self.type_code.trim().to_lowercase();
        // The upstream feed labels both Regional and Special Championships as
        // `regional`; the event name is the only discriminator.
        if type_code == "regional" && self.name.to_lowercase().contains("special championships") {
            type_code = "special".to_string();
        }
        // The calendar also lists online events; they are not physical majors.
        if !matches!(
            type_code.as_str(),
            "world" | "international" | "regional" | "special"
        ) {
            return None;
        }
        if self.name.trim().is_empty() || self.url.trim().is_empty() {
            return None;
        }
        let season_year = self
            .year
            .as_deref()
            .and_then(|year| year.trim().parse::<i32>().ok())
            .unwrap_or_else(|| today.year());
        let (start_date, end_date) =
            parse_date_range(&self.display_date_range, &self.name, season_year, today)?;
        let location = self.location.unwrap_or_default();
        let (city, country) = parse_location(&location, self.region.as_deref());
        let id = self
            .url
            .trim_end_matches('/')
            .rsplit('/')
            .next()
            .filter(|slug| !slug.is_empty())
            .unwrap_or("event")
            .to_string();
        Some(ChampionshipEvent {
            id: format!("{}-{id}", self.year.as_deref().unwrap_or("event")),
            name: self.name.trim().to_string(),
            url: absolute_url(&self.url),
            location: location.trim().to_string(),
            city,
            country,
            type_code,
            region: self.region.filter(|region| !region.trim().is_empty()),
            start_date,
            end_date,
            prize_pool: None,
            winner_name: None,
            winner_country: None,
            players: None,
        })
    }
}

#[derive(Debug, Deserialize)]
struct ResultsResponse {
    #[serde(default)]
    players: Vec<ResultPlayer>,
    #[serde(rename = "totalCount", default)]
    total_count: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct ResultPlayer {
    #[serde(default)]
    place: Option<u32>,
    #[serde(rename = "display_name", default)]
    display_name: Option<String>,
}

fn absolute_url(path: &str) -> String {
    let path = path.trim();
    if path.starts_with("http://") || path.starts_with("https://") {
        path.to_string()
    } else if path.starts_with('/') {
        format!("{BASE}{path}")
    } else {
        format!("{BASE}/{path}")
    }
}

/// Parses official ranges such as `Nov. 20-22`, `Oct. 31 - Nov. 1` or
/// `Apr. 26`. The event name carries the season year (`2027 LAIC` happens in
/// November 2026), so months from September onward belong to the previous
/// calendar year.
fn parse_date_range(
    display: &str,
    name: &str,
    season_year: i32,
    _today: NaiveDate,
) -> Option<(NaiveDate, NaiveDate)> {
    let normalized = display
        .replace('.', " ")
        .replace('–', "-")
        .replace('—', "-")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    if normalized.is_empty() {
        return None;
    }
    let re = Regex::new(
        r"(?i)^([A-Za-z]{3,9})\s+(\d{1,2})(?:\s*-\s*(?:([A-Za-z]{3,9})\s+)?(\d{1,2}))?$",
    )
    .ok()?;
    let captures = re.captures(&normalized)?;
    let month = month_number(captures.get(1)?.as_str())?;
    let start_day = captures.get(2)?.as_str().parse::<u32>().ok()?;
    let end_month = captures
        .get(3)
        .and_then(|value| month_number(value.as_str()))
        .unwrap_or(month);
    let end_day = captures
        .get(4)
        .and_then(|value| value.as_str().parse::<u32>().ok())
        .unwrap_or(start_day);

    let event_year = year_from_name(name).unwrap_or(season_year);
    let start_year = if month >= 9 {
        event_year - 1
    } else {
        event_year
    };
    let start = NaiveDate::from_ymd_opt(start_year, month, start_day)?;
    let end_year = if end_month < month {
        start_year + 1
    } else {
        start_year
    };
    let end = NaiveDate::from_ymd_opt(end_year, end_month, end_day)
        .unwrap_or(start)
        .max(start);
    Some((start, end))
}

fn year_from_name(name: &str) -> Option<i32> {
    let re = Regex::new(r"\b(20\d{2})\b").ok()?;
    re.find(name)
        .and_then(|found| found.as_str().parse::<i32>().ok())
}

fn month_number(value: &str) -> Option<u32> {
    let lower = value.trim().to_lowercase();
    let prefix = lower.get(..3)?;
    Some(match prefix {
        "jan" => 1,
        "feb" => 2,
        "mar" => 3,
        "apr" => 4,
        "may" => 5,
        "jun" => 6,
        "jul" => 7,
        "aug" => 8,
        "sep" => 9,
        "oct" => 10,
        "nov" => 11,
        "dec" => 12,
        _ => return None,
    })
}

fn parse_location(location: &str, region: Option<&str>) -> (Option<String>, Option<String>) {
    let parts = location
        .split(',')
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>();
    if parts.is_empty() {
        let country = match region.map(str::to_lowercase).as_deref() {
            Some("northamerica") => Some("US".to_string()),
            _ => None,
        };
        return (None, country);
    }
    if location.eq_ignore_ascii_case("online") {
        return (None, None);
    }
    let city = Some(parts[0].to_string());
    let last = parts.last().copied().unwrap_or_default();
    let country = country_code(last)
        .or_else(|| {
            if parts.len() >= 2 {
                country_code(parts[parts.len() - 2])
            } else {
                None
            }
        })
        .or_else(|| match region.map(str::to_lowercase).as_deref() {
            Some("northamerica") => Some("US".to_string()),
            _ => None,
        });
    (city, country)
}

fn country_code(value: &str) -> Option<String> {
    let normalized = value
        .trim()
        .to_lowercase()
        .chars()
        .filter_map(|character| match character {
            '.' => None,
            'á' => Some('a'),
            'é' => Some('e'),
            'í' => Some('i'),
            'ó' => Some('o'),
            'ú' => Some('u'),
            'ñ' => Some('n'),
            other => Some(other),
        })
        .collect::<String>();
    let code = match normalized.as_str() {
        "brazil" | "brasil" => "BR",
        "argentina" => "AR",
        "chile" => "CL",
        "peru" | "perú" => "PE",
        "mexico" | "méxico" => "MX",
        "colombia" => "CO",
        "united states" | "united states of america" | "usa" | "us" => "US",
        "canada" => "CA",
        "united kingdom" | "uk" | "great britain" | "england" | "scotland" | "wales" => "GB",
        "germany" | "deutschland" => "DE",
        "poland" => "PL",
        "france" => "FR",
        "italy" | "italia" => "IT",
        "spain" | "españa" => "ES",
        "portugal" => "PT",
        "czechia" | "czech republic" => "CZ",
        "netherlands" => "NL",
        "belgium" => "BE",
        "switzerland" => "CH",
        "austria" => "AT",
        "denmark" => "DK",
        "sweden" => "SE",
        "norway" => "NO",
        "finland" => "FI",
        "ireland" => "IE",
        "australia" => "AU",
        "new zealand" => "NZ",
        "japan" => "JP",
        "south korea" | "korea" => "KR",
        "china" => "CN",
        "south africa" => "ZA",
        "singapore" => "SG",
        "indonesia" => "ID",
        "philippines" => "PH",
        "thailand" => "TH",
        "malaysia" => "MY",
        "india" => "IN",
        "united arab emirates" => "AE",
        "saudi arabia" => "SA",
        "turkey" | "türkiye" => "TR",
        // US states and Canadian provinces used by the official calendar.
        "al" | "ak" | "az" | "ar" | "ca" | "co" | "ct" | "de" | "fl" | "ga" | "hi" | "id"
        | "il" | "in" | "ia" | "ks" | "ky" | "la" | "me" | "md" | "ma" | "mi" | "mn" | "ms"
        | "mo" | "mt" | "ne" | "nv" | "nh" | "nj" | "nm" | "ny" | "nc" | "nd" | "oh" | "ok"
        | "or" | "pa" | "ri" | "sc" | "sd" | "tn" | "tx" | "ut" | "vt" | "va" | "wa" | "wv"
        | "wi" | "wy" | "dc" => "US",
        "on" | "bc" | "qc" | "ab" | "mb" | "sk" | "ns" | "nb" | "nl" | "pe" | "yt" | "nt"
        | "nu" => "CA",
        _ => return None,
    };
    Some(code.to_string())
}

fn split_country(display_name: &str) -> (String, Option<String>) {
    let trimmed = display_name.trim();
    if let Some(open) = trimmed.rfind(" [") {
        if trimmed.ends_with(']') {
            let code = &trimmed[open + 2..trimmed.len() - 1];
            if code.len() == 2 && code.chars().all(|c| c.is_ascii_alphabetic()) {
                return (
                    trimmed[..open].trim().to_string(),
                    Some(code.to_uppercase()),
                );
            }
        }
    }
    (trimmed.to_string(), None)
}

/// Extracts the first cash amount published inside the "Prizing Information"
/// section. The official pages encode the section as JSON inside a script, so
/// the raw HTML contains `copy_html` values. This keeps the source of truth on
/// the organizer page and never invents a prize pool.
fn prize_pool_from_html(html: &str) -> Option<String> {
    let marker = "let encodedData = '";
    let start = html.find(marker)? + marker.len();
    let rest = &html[start..];
    let end = rest.find("';")?;
    let raw = &rest[..end];
    let value: Value = serde_json::from_str(raw).ok()?;
    let mut prizing_text = Vec::new();
    collect_prizing_text(&value, &mut prizing_text);
    if prizing_text.is_empty() {
        return None;
    }
    let text = prizing_text.join(" ");
    extract_cash_amount(&text)
}

fn collect_prizing_text(value: &Value, out: &mut Vec<String>) {
    match value {
        Value::Object(map) => {
            let is_prizing = map
                .get("anchorLinkID_s")
                .and_then(Value::as_str)
                .is_some_and(|value| value.eq_ignore_ascii_case("prizing"))
                || map
                    .get("title_s")
                    .and_then(Value::as_str)
                    .is_some_and(|value| value.to_lowercase().contains("prizing"));
            if is_prizing {
                for key in ["copy_html", "middleCopy_html", "bottomCopy_html"] {
                    if let Some(text) = map.get(key).and_then(Value::as_str) {
                        if !text.trim().is_empty() {
                            out.push(text.to_string());
                        }
                    }
                }
            }
            for child in map.values() {
                collect_prizing_text(child, out);
            }
        }
        Value::Array(items) => {
            for child in items {
                collect_prizing_text(child, out);
            }
        }
        _ => {}
    }
}

fn extract_cash_amount(text: &str) -> Option<String> {
    let re = Regex::new(
        r"(?i)(?:prize pool|prizes?|cash prizes?|premios? en efectivo|bolsa de premios)[^.$€£]{0,180}?((?:R\$|[$€£])\s?\d[\d.,]*\s*(?:USD|EUR|GBP|BRL|MXN|CAD|AUD|JPY|CLP|ARS|COP|PEN)?)",
    )
    .ok()?;
    let captures = re.captures(text)?;
    let amount = captures.get(1)?.as_str().trim();
    let amount = amount
        .trim_end_matches(['.', ',', ';', ':'])
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    if amount.chars().any(|c| c.is_ascii_digit()) {
        Some(amount)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_single_and_cross_month_ranges() {
        let today = NaiveDate::from_ymd_opt(2026, 11, 22).unwrap();
        let (start, end) = parse_date_range(
            "Nov. 20–22",
            "2027 Pokémon Latin America International",
            2027,
            today,
        )
        .unwrap();
        assert_eq!(start, NaiveDate::from_ymd_opt(2026, 11, 20).unwrap());
        assert_eq!(end, NaiveDate::from_ymd_opt(2026, 11, 22).unwrap());

        let (start, end) = parse_date_range(
            "Oct. 31 - Nov. 1",
            "2027 Gdansk Pokémon Regional",
            2027,
            today,
        )
        .unwrap();
        assert_eq!(start, NaiveDate::from_ymd_opt(2026, 10, 31).unwrap());
        assert_eq!(end, NaiveDate::from_ymd_opt(2026, 11, 1).unwrap());

        let (start, end) = parse_date_range("Apr. 26", "UCS Regional Finals", 2026, today).unwrap();
        assert_eq!(start, NaiveDate::from_ymd_opt(2026, 4, 26).unwrap());
        assert_eq!(end, start);
    }

    #[test]
    fn parses_the_brazilian_and_us_locations() {
        assert_eq!(
            parse_location("São Paulo, Brazil", Some("latinamerica")),
            (Some("São Paulo".into()), Some("BR".into()))
        );
        assert_eq!(
            parse_location("Las Vegas, NV", Some("northamerica")),
            (Some("Las Vegas".into()), Some("US".into()))
        );
        assert_eq!(
            parse_location("Toronto, ON", Some("northamerica")),
            (Some("Toronto".into()), Some("CA".into()))
        );
        assert_eq!(parse_location("Online", Some("online")), (None, None));
    }

    #[test]
    fn extracts_the_prize_pool_from_the_prizing_copy() {
        let html = r#"
        <script>
        let encodedData = '{"contentBlades_o":[{"content-type":"/component/transparentgenericblade","anchorLinkID_s":"prizing","title_s":"Prizing Information","copy_html":"&lt;p&gt;The prize pool includes over $500,000 USD, booster packs and invitations.&lt;/p&gt;","middleCopy_html":"","bottomCopy_html":""}]}';
        </script>
        "#;
        assert_eq!(prize_pool_from_html(html).as_deref(), Some("$500,000 USD"));
    }

    #[test]
    fn ignores_prizing_without_cash() {
        let html = r#"
        <script>
        let encodedData = '{"contentBlades_o":[{"anchorLinkID_s":"prizing","title_s":"Prizing Information","copy_html":"&lt;p&gt;Trophies, playmats and booster packs.&lt;/p&gt;"}]}';
        </script>
        "#;
        assert!(prize_pool_from_html(html).is_none());
    }

    #[test]
    fn classifies_special_championships_from_the_name() {
        let event = RawEvent {
            name: "2027 Buenos Aires Pokémon Special Championships".into(),
            url: "/en-us/events/regionals/2027/buenos-aires".into(),
            display_date_range: "Nov. 14–15".into(),
            type_code: "regional".into(),
            region: Some("latinamerica".into()),
            year: Some("2027".into()),
            location: Some("Buenos Aires, Argentina".into()),
        };
        let mapped = event
            .into_event(NaiveDate::from_ymd_opt(2026, 11, 22).unwrap())
            .unwrap();
        assert_eq!(mapped.type_code, "special");
    }

    #[test]
    fn parses_country_suffix_from_results() {
        assert_eq!(
            split_country("Emilio Forbes [US]"),
            ("Emilio Forbes".into(), Some("US".into()))
        );
        assert_eq!(split_country("Masahiro T"), ("Masahiro T".into(), None));
    }
}
