use crate::adapters::HttpClient;
use crate::config;
use crate::domain::regulation::RegulationNewsItem;
use crate::error::AppError;
use chrono::{DateTime, NaiveDate, Utc};
use regex::Regex;
use serde::Deserialize;
use std::sync::Arc;

/// Official Pokémon Champions news index. It is a small JSON file; the
/// individual article links are relative to the same host.
const NEWS_LIST: &str = "https://champions-news.pokemon-home.com/en/json/list.json";
const NEWS_HOST: &str = "https://champions-news.pokemon-home.com/en/";

#[derive(Debug, Clone, Deserialize)]
struct NewsList {
    data: Vec<NewsItem>,
}

#[derive(Debug, Clone, Default, Deserialize)]
struct NewsItem {
    #[serde(default)]
    id: String,
    #[serde(default)]
    title: String,
    #[serde(default)]
    info_kind: i32,
    #[serde(default)]
    link: String,
    #[serde(default)]
    banner: String,
    #[serde(rename = "kindTxt", default)]
    kind_txt: String,
    #[serde(rename = "isImportant", default)]
    is_important: i32,
    #[serde(default)]
    pub_at: i64,
    #[serde(default)]
    st_at: i64,
    #[serde(rename = "infoKind", default)]
    info_kind_camel: i32,
    #[serde(rename = "pubAt", default)]
    pub_at_camel: i64,
    #[serde(rename = "stAt", default)]
    st_at_camel: i64,
}

impl NewsItem {
    fn kind(&self) -> i32 {
        if self.info_kind != 0 {
            self.info_kind
        } else {
            self.info_kind_camel
        }
    }
    fn published(&self) -> i64 {
        self.pub_at
            .max(self.pub_at_camel)
            .max(self.st_at)
            .max(self.st_at_camel)
    }
}

#[derive(Debug, Clone)]
pub struct OfficialRegulation {
    pub code: String,
    pub label: String,
    pub start_at: DateTime<Utc>,
    pub end_at: DateTime<Utc>,
    pub new_megas: Vec<String>,
    pub roster_url: String,
}

#[derive(Debug, Clone)]
pub struct OfficialSeason {
    pub name: String,
    pub start_at: DateTime<Utc>,
    pub end_at: DateTime<Utc>,
    pub regulation_code: Option<String>,
    pub roster_url: Option<String>,
}

#[derive(Clone)]
pub struct OfficialRegulationClient {
    http: Arc<HttpClient>,
}

impl OfficialRegulationClient {
    pub fn new(http: Arc<HttpClient>) -> Self {
        Self { http }
    }

    /// Discover the newest official regulation and season. Each call is cheap
    /// thanks to HttpClient's SQLite cache; a forced refresh uses TTL 0.
    pub async fn discover(
        &self,
        force: bool,
    ) -> Result<(Option<OfficialRegulation>, Option<OfficialSeason>), AppError> {
        let ttl = if force {
            0
        } else {
            config::TTL_REGULATION_OFFICIAL
        };
        let bytes = self.http.get_cached(NEWS_LIST, ttl).await?;
        let list: NewsList = serde_json::from_slice(&bytes)?;
        let host = NEWS_HOST;

        let latest_reg = list
            .data
            .iter()
            .filter(|n| n.kind() == 12)
            .filter(|n| regex_code(&n.title).is_some())
            .max_by_key(|n| n.published())
            .cloned();
        let latest_season = list
            .data
            .iter()
            .filter(|n| n.kind() == 11)
            .filter(|n| regex_season(&n.title).is_some())
            .max_by_key(|n| n.published())
            .cloned();

        let regulation = match latest_reg {
            Some(item) => {
                let url = absolute(host, &item.link);
                let html = self.http.get_cached(&url, ttl).await?;
                let text = String::from_utf8_lossy(&html);
                Some(parse_regulation(&text)?)
            }
            None => None,
        };
        let season = match latest_season {
            Some(item) => {
                let url = absolute(host, &item.link);
                let html = self.http.get_cached(&url, ttl).await?;
                let text = String::from_utf8_lossy(&html);
                Some(parse_season(&text)?)
            }
            None => None,
        };
        Ok((regulation, season))
    }

    /// Official news feed used by the Dashboard regulation view. The list is
    /// chronological and capped so the UI does not render the entire archive.
    pub async fn news(&self, force: bool) -> Result<Vec<RegulationNewsItem>, AppError> {
        let ttl = if force {
            0
        } else {
            config::TTL_REGULATION_OFFICIAL
        };
        let bytes = self.http.get_cached(NEWS_LIST, ttl).await?;
        let list: NewsList = serde_json::from_slice(&bytes)?;
        let mut out: Vec<RegulationNewsItem> = list
            .data
            .into_iter()
            .filter(|n| !n.title.trim().is_empty() && !n.link.trim().is_empty())
            .map(|item| to_news_item(NEWS_HOST, item))
            .collect();
        out.sort_by(|a, b| b.published_at.cmp(&a.published_at));
        out.truncate(30);
        Ok(out)
    }

    pub async fn roster(&self, url: &str, force: bool) -> Result<Vec<String>, AppError> {
        let ttl = if force {
            0
        } else {
            config::TTL_REGULATION_OFFICIAL
        };
        let bytes = self.http.get_cached(url, ttl).await?;
        let text = String::from_utf8_lossy(&bytes);
        parse_roster(&text)
    }
}

fn to_news_item(host: &str, item: NewsItem) -> RegulationNewsItem {
    let published_at = DateTime::from_timestamp(item.published(), 0).map(|d| d.to_rfc3339());
    RegulationNewsItem {
        id: if item.id.trim().is_empty() {
            item.link.clone()
        } else {
            item.id
        },
        title: item.title.trim().to_string(),
        url: absolute(host, &item.link),
        category: if item.kind_txt.trim().is_empty() {
            "News".into()
        } else {
            item.kind_txt.trim().to_string()
        },
        published_at,
        banner_url: if item.banner.trim().is_empty() {
            None
        } else {
            Some(absolute(host, &item.banner))
        },
        important: item.is_important != 0,
    }
}

fn absolute(host: &str, link: &str) -> String {
    if link.starts_with("http") {
        link.to_string()
    } else {
        format!("{host}{}", link.trim_start_matches('/'))
    }
}

fn regex_code(title: &str) -> Option<String> {
    let re = Regex::new(r"(?i)Regulation Set (M-[A-Z])").ok()?;
    re.captures(title).map(|c| c[1].to_string())
}

fn regex_season(title: &str) -> Option<String> {
    let re = Regex::new(r"(?i)Season (M-\d+)").ok()?;
    re.captures(title).map(|c| c[1].to_string())
}

fn parse_regulation(html: &str) -> Result<OfficialRegulation, AppError> {
    let code = regex_code(html)
        .ok_or_else(|| AppError::Validation("official regulation code missing".into()))?;
    let label = format!("Regulation {code}");
    let (start_at, end_at) = parse_dates(html)?;
    let new_megas = parse_new_megas(html);
    let roster_url = parse_roster_url(html)
        .ok_or_else(|| AppError::Validation("official roster link missing".into()))?;
    Ok(OfficialRegulation {
        code,
        label,
        start_at,
        end_at,
        new_megas,
        roster_url,
    })
}

fn parse_season(html: &str) -> Result<OfficialSeason, AppError> {
    let re = Regex::new(r"(?i)Season (M-\d+)").ok().unwrap();
    let name = re
        .captures(html)
        .map(|c| c[1].to_string())
        .ok_or_else(|| AppError::Validation("official season name missing".into()))?;
    let (start_at, end_at) = parse_dates(html)?;
    let regulation_code = Regex::new(r"(?i)Regulation Set (M-[A-Z])")
        .ok()
        .and_then(|re| re.captures(html))
        .map(|c| c[1].to_string());
    let roster_url = parse_roster_url(html);
    Ok(OfficialSeason {
        name,
        start_at,
        end_at,
        regulation_code,
        roster_url,
    })
}

fn parse_dates(html: &str) -> Result<(DateTime<Utc>, DateTime<Utc>), AppError> {
    let re = Regex::new(
        r"(?i)(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4}),?\s+at\s+(\d{2}):(\d{2})\s+UTC",
    )
    .map_err(|e| AppError::Internal(e.to_string()))?;
    let mut dates = Vec::new();
    for c in re.captures_iter(html) {
        let month = match &c[1].to_ascii_lowercase()[..] {
            "january" => 1,
            "february" => 2,
            "march" => 3,
            "april" => 4,
            "may" => 5,
            "june" => 6,
            "july" => 7,
            "august" => 8,
            "september" => 9,
            "october" => 10,
            "november" => 11,
            "december" => 12,
            _ => continue,
        };
        let day: u32 = c[2].parse().unwrap_or(0);
        let year: i32 = c[3].parse().unwrap_or(0);
        let hour: u32 = c[4].parse().unwrap_or(0);
        let minute: u32 = c[5].parse().unwrap_or(0);
        if let Some(date) = NaiveDate::from_ymd_opt(year, month, day) {
            if let Some(dt) = date.and_hms_opt(hour, minute, 0) {
                dates.push(dt.and_utc());
            }
        }
        if dates.len() == 2 {
            break;
        }
    }
    if dates.len() < 2 {
        return Err(AppError::Validation(
            "official date range could not be parsed".into(),
        ));
    }
    Ok((dates[0], dates[1]))
}

fn parse_new_megas(html: &str) -> Vec<String> {
    let re = Regex::new(r"(?i)Mega\s+[A-Z][A-Za-z' -]*(?:\s+Z)?")
        .ok()
        .unwrap();
    let mut out: Vec<String> = re
        .find_iter(html)
        .map(|m| m.as_str().trim().to_string())
        .filter(|m| {
            !matches!(
                m.to_ascii_lowercase().as_str(),
                "mega evolution" | "mega evolutions" | "mega stone" | "mega stones"
            )
        })
        .collect();
    out.sort();
    out.dedup();
    out
}

fn parse_roster_url(html: &str) -> Option<String> {
    let re =
        Regex::new(r#"href="(https://web-view\.app\.pokemonchampions\.jp/[^"]*pokemon\.html)""#)
            .ok()?;
    re.captures(html).map(|c| c[1].to_string())
}

fn parse_roster(html: &str) -> Result<Vec<String>, AppError> {
    let re = Regex::new(r#"\["\d{4}-\d{3}",\s*\d+,\s*"([^"]+)"\]"#)
        .map_err(|e| AppError::Internal(e.to_string()))?;
    let mut names: Vec<String> = re.captures_iter(html).map(|c| c[1].to_string()).collect();
    names.sort();
    names.dedup();
    if names.is_empty() {
        return Err(AppError::Validation(
            "official eligible roster is empty or malformed".into(),
        ));
    }
    Ok(names)
}

#[cfg(test)]
mod tests {
    use super::*;

    const NOTICE: &str = r#"
      <h1>Regulation Set M-C</h1>
      Wednesday, September 9, 2026, at 02:00 UTC to Wednesday, December 2, 2026, at 01:59 UTC
      <h4> Mega Absol Z<br/> Mega Salamence<br/> Mega Garchomp Z<br/> Mega Lucario Z<br/> Mega Golisopod<br/> Mega Baxcalibur</h4>
      <a href="https://web-view.app.pokemonchampions.jp/battle/pages/events/rs1/en/pokemon.html">Eligible</a>
    "#;

    #[test]
    fn parses_notice_dates_megas_and_roster_link() {
        let r = parse_regulation(NOTICE).unwrap();
        assert_eq!(r.code, "M-C");
        assert_eq!(r.start_at.to_rfc3339(), "2026-09-09T02:00:00+00:00");
        assert_eq!(r.end_at.to_rfc3339(), "2026-12-02T01:59:00+00:00");
        assert!(r.new_megas.iter().any(|m| m == "Mega Salamence"));
        assert!(r.roster_url.ends_with("/pokemon.html"));
    }

    #[test]
    fn parses_roster_array() {
        let html = r#"const pokemons = [["0003-000",1,"Venusaur"],["0025-000",1,"Pikachu"]];"#;
        let names = parse_roster(html).unwrap();
        assert_eq!(names, vec!["Pikachu", "Venusaur"]);
    }

    #[test]
    fn rejects_an_empty_roster() {
        assert!(parse_roster("<html></html>").is_err());
    }

    const NEWS_JSON: &str = r#"{
      "data": [
        {
          "id": "867",
          "title": "Ranked Battles Season M-8 Underway!",
          "infoKind": 11,
          "kindTxt": "Ranked Battles",
          "link": "page/867.html",
          "banner": "page/banner/2_1790323887_12691793402681.jpg",
          "isImportant": 0,
          "stAt": 1793764800,
          "pubAt": 1793764815
        }
      ]
    }"#;

    #[test]
    fn maps_the_official_news_feed() {
        let list: NewsList = serde_json::from_str(NEWS_JSON).unwrap();
        let item = to_news_item(NEWS_HOST, list.data[0].clone());
        assert_eq!(item.id, "867");
        assert_eq!(item.category, "Ranked Battles");
        assert_eq!(
            item.url,
            "https://champions-news.pokemon-home.com/en/page/867.html"
        );
        assert_eq!(
            item.published_at.as_deref(),
            Some("2026-11-04T04:00:15+00:00")
        );
        assert!(item
            .banner_url
            .unwrap()
            .starts_with("https://champions-news.pokemon-home.com/en/page/banner/"));
        assert!(!item.important);
    }
}
