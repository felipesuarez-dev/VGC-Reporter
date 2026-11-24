use crate::adapters::HttpClient;
use crate::config;
use crate::domain::event_match::{event_match_score, parse_listing_date};
use crate::error::AppError;
use chrono::NaiveDate;
use regex::Regex;
use scraper::{ElementRef, Html, Selector};
use serde::Deserialize;
use serde_json::Value;
use std::sync::Arc;

/// Public mirror of the official Play! Pokémon Event Locator. It exposes the
/// upcoming VG League Challenges and Cups, including venue and country, which
/// the Limitless API does not have. The endpoint is undocumented, so failures
/// are isolated to the upcoming panel and never break the rest of the app.
const POKEDATA_BASE: &str = "https://pokedata.ovh/events/apiv2";
const POKEDATA_STANDINGS: &str = "https://www.pokedata.ovh/standings2/";
const POKEDATA_STANDINGS_JSON: &str = "https://www.pokedata.ovh/standings2/standings";
const BROWSER_HEADERS: &[(&str, &str)] = &[
    (
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 \
         (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    ),
    ("Accept-Language", "en-US,en;q=0.9"),
];

#[derive(Debug, Clone, PartialEq)]
pub struct PokedataMatch {
    pub round: u32,
    pub phase: String,
    pub opponent_name: String,
    pub opponent_country: Option<String>,
    pub opponent_place: Option<u32>,
    pub result: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PokedataStanding {
    pub place: u32,
    pub player_name: String,
    pub country: Option<String>,
    pub wins: u32,
    pub losses: u32,
    pub ties: u32,
    pub record: Option<String>,
    pub matches: Vec<PokedataMatch>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PokedataStandings {
    pub event_id: String,
    pub event_name: String,
    pub event_date: Option<NaiveDate>,
    pub event_url: String,
    pub swiss_rounds: Option<u32>,
    pub players: Vec<PokedataStanding>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PokedataTopCutPlayer {
    pub name: String,
    pub seed: Option<u32>,
    pub country: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PokedataTopCutMatch {
    pub winner: PokedataTopCutPlayer,
    pub loser: PokedataTopCutPlayer,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PokedataTopCutRound {
    pub label: String,
    pub matches: Vec<PokedataTopCutMatch>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PokedataTeamPokemon {
    pub name: String,
    pub item: Option<String>,
    pub moves: Vec<String>,
    pub sprite_url: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PokedataTeam {
    pub player_name: String,
    pub country: Option<String>,
    pub placement: Option<u32>,
    pub record: Option<String>,
    pub pokemon: Vec<PokedataTeamPokemon>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PokedataDivision {
    pub name: String,
    pub count: Option<u32>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PokedataTopCut {
    pub event_id: String,
    pub event_name: String,
    pub event_date: Option<NaiveDate>,
    pub event_url: String,
    pub rounds: Vec<PokedataTopCutRound>,
    /// All teams published on the standings page (not only the top cut).
    pub teams: Vec<PokedataTeam>,
    /// Divisions exposed by the page. `Junior-Senior` means there is no
    /// Masters bracket for this event.
    pub divisions: Vec<PokedataDivision>,
}

#[derive(Debug, Clone)]
struct PokedataTournamentRef {
    id: String,
    name: String,
    date: Option<NaiveDate>,
    page_url: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PokedataEvent {
    pub id: String,
    pub name: String,
    pub date: String,
    pub time: Option<String>,
    pub kind: Option<String>,
    pub city: Option<String>,
    pub country: Option<String>,
    pub venue: Option<String>,
    pub url: Option<String>,
    pub street_address: Option<String>,
    pub state: Option<String>,
    pub postal_code: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub contact_email: Option<String>,
    pub contact_phone: Option<String>,
    pub details: Option<String>,
    pub registration_start: Option<String>,
    pub registration_end: Option<String>,
    pub admission: Option<String>,
    pub event_website: Option<String>,
    pub third_party_registration_website: Option<String>,
}

#[derive(Clone)]
pub struct PokedataClient {
    http: Arc<HttpClient>,
}

impl PokedataClient {
    pub fn new(http: Arc<HttpClient>) -> Self {
        Self { http }
    }

    pub async fn upcoming(
        &self,
        country: Option<&str>,
        from: NaiveDate,
        to: NaiveDate,
    ) -> Result<Vec<PokedataEvent>, AppError> {
        let country = country
            .map(|value| value.trim().to_uppercase())
            .filter(|value| !value.is_empty());
        if let Some(code) = country.as_deref() {
            if code.len() != 2 || !code.chars().all(|c| c.is_ascii_alphabetic()) {
                return Err(AppError::Validation(format!(
                    "invalid ISO country code: {code}"
                )));
            }
        }
        let base = match country.as_deref() {
            Some(code) => format!(
                "{POKEDATA_BASE}/_vg/challenges/cups/_country/{code}/_start/{}/_end/{}",
                from.format("%Y-%m-%d"),
                to.format("%Y-%m-%d")
            ),
            None => format!(
                "{POKEDATA_BASE}/_vg/challenges/cups/_start/{}/_end/{}",
                from.format("%Y-%m-%d"),
                to.format("%Y-%m-%d")
            ),
        };
        // "All countries" is the only mode that can exceed 100 events quickly;
        // two pages give the nearest 200 events, enough for the panel's 60-row
        // limit. A specific country only needs its first page.
        let max_pages = if country.is_some() { 1 } else { 2 };
        let mut events: Vec<PokedataEvent> = Vec::new();
        let mut seen = std::collections::HashSet::new();
        let mut total_pages = 1usize;

        for page in 1..=max_pages {
            if page > total_pages {
                break;
            }
            let url = if page == 1 {
                base.clone()
            } else {
                format!("{base}/_page/{page}")
            };
            let bytes = match self
                .http
                .get_cached_with_headers(
                    &url,
                    &[
                        ("Accept", "application/json"),
                        // The host rejects requests without a browser-like UA.
                        ("User-Agent", "Mozilla/5.0 (VGC Reporter)"),
                    ],
                    config::TTL_POKEDATA,
                )
                .await
            {
                Ok(bytes) => bytes,
                Err(error) if page > 1 => {
                    tracing::warn!(%error, %url, "event locator page unavailable");
                    break;
                }
                Err(error) => return Err(error),
            };
            let text = String::from_utf8_lossy(&bytes);
            let Some(start) = text.find('{') else {
                if page == 1 {
                    return Err(AppError::Validation(
                        "event locator returned no JSON".into(),
                    ));
                }
                break;
            };
            let value: Value = serde_json::from_str(&text[start..])?;
            total_pages = value
                .get("metadata")
                .and_then(|metadata| metadata.get("total_pages"))
                .and_then(Value::as_u64)
                .unwrap_or(1)
                .max(1) as usize;
            let Some(page_events) = value.get("events").and_then(Value::as_array) else {
                if page == 1 {
                    return Err(AppError::Validation(
                        "event locator payload missing events".into(),
                    ));
                }
                break;
            };
            for event in page_events
                .iter()
                .filter_map(|event| to_event(event, from, to))
            {
                if seen.insert(event.id.clone()) {
                    events.push(event);
                }
            }
        }
        Ok(events)
    }

    /// Independent Masters standings from PokéData's standings mirror. This is
    /// a fallback for official events whose results feed is empty or late.
    pub async fn standings(
        &self,
        name: &str,
        date: Option<NaiveDate>,
    ) -> Result<Option<PokedataStandings>, AppError> {
        let Some(event) = self.find_event(name, date).await? else {
            return Ok(None);
        };
        // PokéData uses `Masters` for most events and `Master` for a few
        // specials. Try both before giving up.
        let mut division = "Masters";
        let mut url = format!("{POKEDATA_STANDINGS_JSON}/{}_Masters.json", event.id);
        let mut bytes = self
            .http
            .get_cached_with_headers(
                &url,
                &[
                    ("Accept", "application/json"),
                    ("User-Agent", BROWSER_HEADERS[0].1),
                ],
                config::TTL_POKEDATA_STANDINGS,
            )
            .await;
        if bytes.is_err() {
            division = "Master";
            url = format!("{POKEDATA_STANDINGS_JSON}/{}_Master.json", event.id);
            bytes = self
                .http
                .get_cached_with_headers(
                    &url,
                    &[
                        ("Accept", "application/json"),
                        ("User-Agent", BROWSER_HEADERS[0].1),
                    ],
                    config::TTL_POKEDATA_STANDINGS,
                )
                .await;
        }
        let bytes = bytes?;
        let payload: PokedataJson = serde_json::from_slice(&bytes)?;
        let player_index = payload
            .standings
            .players
            .iter()
            .enumerate()
            .filter(|(_, player)| !player.n.trim().is_empty())
            .map(|(index, player)| {
                (
                    player.i,
                    (
                        player.n.trim().to_string(),
                        player
                            .c
                            .as_deref()
                            .map(str::trim)
                            .filter(|code| code.len() == 2)
                            .map(str::to_uppercase),
                        index as u32 + 1,
                    ),
                )
            })
            .collect::<std::collections::HashMap<_, _>>();
        let swiss_rounds = swiss_rounds(&payload);
        let players = payload
            .standings
            .players
            .iter()
            .enumerate()
            .filter_map(|(index, player)| {
                let player_name = player.n.trim();
                if player_name.is_empty() {
                    return None;
                }
                let wins = *player.s.first().unwrap_or(&0);
                let losses = *player.s.get(1).unwrap_or(&0);
                let ties = *player.s.get(2).unwrap_or(&0);
                let record = (wins + losses + ties > 0).then(|| format!("{wins}-{losses}-{ties}"));
                let matches = player
                    .r
                    .iter()
                    .enumerate()
                    .map(|(round_index, row)| {
                        let opponent_id = row.first().and_then(Value::as_i64).unwrap_or(-1);
                        let code = row.get(1).and_then(Value::as_i64).unwrap_or(0);
                        let opponent = player_index.get(&opponent_id);
                        let bye = opponent_id < 0 || opponent.is_none();
                        let round = round_index as u32 + 1;
                        PokedataMatch {
                            round,
                            phase: if swiss_rounds.is_some_and(|swiss| round > swiss) {
                                "top-cut".to_string()
                            } else {
                                "swiss".to_string()
                            },
                            opponent_name: if opponent_id < 0 {
                                "BYE".to_string()
                            } else {
                                opponent
                                    .map(|(name, _, _)| name.clone())
                                    .unwrap_or_else(|| format!("Player #{opponent_id}"))
                            },
                            opponent_country: opponent.and_then(|(_, country, _)| country.clone()),
                            opponent_place: opponent.map(|(_, _, place)| *place),
                            result: if bye && opponent_id < 0 {
                                "bye".to_string()
                            } else {
                                match code {
                                    3 => "win",
                                    0 => "loss",
                                    1 => "tie",
                                    _ => "unknown",
                                }
                                .to_string()
                            },
                        }
                    })
                    .collect();
                Some(PokedataStanding {
                    place: index as u32 + 1,
                    player_name: player_name.to_string(),
                    country: player
                        .c
                        .as_deref()
                        .map(str::trim)
                        .filter(|code| code.len() == 2)
                        .map(str::to_uppercase),
                    wins,
                    losses,
                    ties,
                    record,
                    matches,
                })
            })
            .collect();
        let event_url = format!("{POKEDATA_STANDINGS}{}/{division}", event.id);
        Ok(Some(PokedataStandings {
            event_id: event.id,
            event_name: event.name,
            event_date: event.date,
            event_url,
            swiss_rounds,
            players,
        }))
    }

    /// Top Cut bracket, teams and division metadata from PokéData. Some
    /// events render a bracket; others only publish the final table and the
    /// team list. Both cases are preserved, and `Junior-Senior` divisions are
    /// exposed so the UI can explain why there is no Masters cut.
    pub async fn top_cut(
        &self,
        name: &str,
        date: Option<NaiveDate>,
    ) -> Result<Option<PokedataTopCut>, AppError> {
        let Some(event) = self.find_event(name, date).await? else {
            return Ok(None);
        };
        let mut used_url = event.page_url.clone();
        let mut page = match self
            .http
            .get_cached_with_headers(&used_url, BROWSER_HEADERS, config::TTL_POKEDATA_STANDINGS)
            .await
        {
            Ok(bytes) => String::from_utf8_lossy(&bytes).into_owned(),
            Err(error) => {
                tracing::debug!(%error, url = %used_url, "PokéData Masters page unavailable");
                String::new()
            }
        };
        if page.is_empty() {
            let singular = event.page_url.replace("/Masters", "/Master");
            if let Ok(bytes) = self
                .http
                .get_cached_with_headers(&singular, BROWSER_HEADERS, config::TTL_POKEDATA_STANDINGS)
                .await
            {
                used_url = singular;
                page = String::from_utf8_lossy(&bytes).into_owned();
            }
        }
        let mut rounds = parse_top_cut(&page);
        let teams = parse_pokedata_teams(&page);
        if rounds.is_empty() {
            if let Ok(Some(payload)) = self.master_payload(&event.id).await {
                rounds = derive_top_cut_from_json(&payload);
            }
        }
        let mut divisions = parse_divisions(&page);
        if rounds.is_empty() && teams.is_empty() {
            let division_url = used_url
                .trim_end_matches("/Masters")
                .trim_end_matches("/Master");
            match self
                .http
                .get_cached_with_headers(
                    division_url,
                    BROWSER_HEADERS,
                    config::TTL_POKEDATA_STANDINGS,
                )
                .await
            {
                Ok(bytes) => {
                    divisions = parse_divisions(&String::from_utf8_lossy(&bytes));
                }
                Err(error) => {
                    tracing::debug!(%error, url = division_url, "PokéData division page unavailable");
                }
            }
        }
        if rounds.is_empty() && teams.is_empty() && divisions.is_empty() {
            return Ok(None);
        }
        Ok(Some(PokedataTopCut {
            event_id: event.id,
            event_name: event.name,
            event_date: event.date,
            event_url: used_url,
            rounds,
            teams,
            divisions,
        }))
    }

    async fn find_event(
        &self,
        name: &str,
        date: Option<NaiveDate>,
    ) -> Result<Option<PokedataTournamentRef>, AppError> {
        let bytes = self
            .http
            .get_cached_with_headers(
                POKEDATA_STANDINGS,
                BROWSER_HEADERS,
                config::TTL_POKEDATA_STANDINGS,
            )
            .await?;
        let html = String::from_utf8_lossy(&bytes);
        Ok(parse_tournament_list(&html, name, date))
    }

    async fn master_payload(&self, id: &str) -> Result<Option<PokedataJson>, AppError> {
        for suffix in ["Masters", "Master"] {
            let url = format!("{POKEDATA_STANDINGS_JSON}/{id}_{suffix}.json");
            if let Ok(bytes) = self
                .http
                .get_cached_with_headers(
                    &url,
                    &[
                        ("Accept", "application/json"),
                        ("User-Agent", BROWSER_HEADERS[0].1),
                    ],
                    config::TTL_POKEDATA_STANDINGS,
                )
                .await
            {
                if let Ok(payload) = serde_json::from_slice(&bytes) {
                    return Ok(Some(payload));
                }
            }
        }
        Ok(None)
    }
}

fn parse_tournament_list(
    html: &str,
    name: &str,
    date: Option<NaiveDate>,
) -> Option<PokedataTournamentRef> {
    let document = Html::parse_document(html);
    let selector = Selector::parse("div.tournament.vg").ok()?;
    let title_selector = Selector::parse("div.title").ok()?;
    let dates_selector = Selector::parse("div.dates").ok()?;
    let id_selector = Selector::parse(r#"input[name="id"]"#).ok()?;
    let mut best: Option<(i32, PokedataTournamentRef)> = None;
    for node in document.select(&selector) {
        let Some(title) = node.select(&title_selector).next() else {
            continue;
        };
        let event_name = title.text().collect::<String>().trim().to_string();
        let raw_date = node
            .select(&dates_selector)
            .next()
            .map(|entry| entry.text().collect::<String>())
            .unwrap_or_default();
        let event_date = parse_listing_date(raw_date.trim());
        let Some(id) = node
            .select(&id_selector)
            .next()
            .and_then(|input| input.value().attr("value"))
            .map(str::trim)
            .filter(|id| !id.is_empty() && id.chars().all(|c| c.is_ascii_digit()))
        else {
            continue;
        };
        let Some(score) = event_match_score(name, date, &event_name, event_date) else {
            continue;
        };
        let exact_date = date.is_some() && date == event_date;
        let score = score + if exact_date { 2 } else { 0 };
        if best
            .as_ref()
            .map_or(true, |(best_score, _)| score > *best_score)
        {
            best = Some((
                score,
                PokedataTournamentRef {
                    id: id.to_string(),
                    name: event_name,
                    date: event_date,
                    page_url: format!("{POKEDATA_STANDINGS}{id}/Masters"),
                },
            ));
        }
    }
    best.map(|(_, event)| event)
}

fn swiss_rounds(payload: &PokedataJson) -> Option<u32> {
    let days = payload
        .tournament
        .day1
        .unwrap_or(0)
        .saturating_add(payload.tournament.day2.unwrap_or(0));
    if days > 0 {
        return Some(days);
    }
    let champion = payload
        .standings
        .players
        .iter()
        .max_by_key(|player| player.top_cut_elim_round.unwrap_or(0))
        .or_else(|| payload.standings.players.first())?;
    let rounds = champion.r.len() as u32;
    let eliminations = champion.top_cut_elim_round.unwrap_or(0).max(0) as u32;
    (rounds > eliminations).then_some(rounds - eliminations)
}

fn derive_top_cut_from_json(payload: &PokedataJson) -> Vec<PokedataTopCutRound> {
    let Some(swiss_rounds) = swiss_rounds(payload) else {
        return Vec::new();
    };
    if swiss_rounds == 0 {
        return Vec::new();
    }
    let players = payload
        .standings
        .players
        .iter()
        .filter(|player| !player.n.trim().is_empty())
        .map(|player| {
            (
                player.i,
                (
                    player.n.trim().to_string(),
                    player
                        .c
                        .as_deref()
                        .map(str::trim)
                        .filter(|code| code.len() == 2)
                        .map(str::to_uppercase),
                    player.top_cut_seed,
                ),
            )
        })
        .collect::<std::collections::HashMap<_, _>>();
    let max_extra = payload
        .standings
        .players
        .iter()
        .map(|player| player.r.len().saturating_sub(swiss_rounds as usize))
        .max()
        .unwrap_or(0);
    if max_extra == 0 {
        return Vec::new();
    }
    let mut buckets = vec![Vec::<PokedataTopCutMatch>::new(); max_extra];
    let mut seen = std::collections::HashSet::<(i64, i64)>::new();
    for player in &payload.standings.players {
        for (index, row) in player.r.iter().skip(swiss_rounds as usize).enumerate() {
            if index >= max_extra {
                break;
            }
            let opponent_id = row.first().and_then(Value::as_i64).unwrap_or(-1);
            let code = row.get(1).and_then(Value::as_i64).unwrap_or(0);
            let key = if opponent_id < 0 {
                (player.i, -1)
            } else {
                (player.i.min(opponent_id), player.i.max(opponent_id))
            };
            if !seen.insert(key) {
                continue;
            }
            let (winner_id, loser_id) = if opponent_id < 0 || code != 0 {
                (player.i, opponent_id)
            } else {
                (opponent_id, player.i)
            };
            let make_player = |id: i64| {
                if id < 0 {
                    return PokedataTopCutPlayer {
                        name: "BYE".to_string(),
                        seed: None,
                        country: None,
                    };
                }
                match players.get(&id) {
                    Some((name, country, seed)) => PokedataTopCutPlayer {
                        name: name.clone(),
                        seed: *seed,
                        country: country.clone(),
                    },
                    None => PokedataTopCutPlayer {
                        name: format!("Player #{id}"),
                        seed: None,
                        country: None,
                    },
                }
            };
            buckets[index].push(PokedataTopCutMatch {
                winner: make_player(winner_id),
                loser: make_player(loser_id),
            });
        }
    }
    buckets
        .into_iter()
        .enumerate()
        .filter(|(_, matches)| !matches.is_empty())
        .map(|(index, matches)| {
            let size = 1u32 << (max_extra - index);
            PokedataTopCutRound {
                label: if size <= 2 {
                    "Finals".to_string()
                } else {
                    format!("Top {size}")
                },
                matches,
            }
        })
        .collect()
}

fn parse_divisions(html: &str) -> Vec<PokedataDivision> {
    let document = Html::parse_document(html);
    let Ok(division_selector) = Selector::parse("div.division") else {
        return Vec::new();
    };
    let Ok(name_selector) = Selector::parse("div.name") else {
        return Vec::new();
    };
    let Ok(count_selector) = Selector::parse("span.div-count-badge") else {
        return Vec::new();
    };
    let Ok(nav_selector) = Selector::parse("nav.division-nav-ribbon a.div-nav-btn") else {
        return Vec::new();
    };
    let mut out = document
        .select(&division_selector)
        .filter_map(|division| {
            let name = division
                .select(&name_selector)
                .next()
                .map(|node| node.text().collect::<String>().trim().to_string())
                .filter(|name| !name.is_empty())?;
            let count = division
                .select(&count_selector)
                .next()
                .map(|node| node.text().collect::<String>())
                .and_then(|value| value.trim().parse::<u32>().ok());
            Some(PokedataDivision { name, count })
        })
        .collect::<Vec<_>>();
    if out.is_empty() {
        out = document
            .select(&nav_selector)
            .filter_map(|link| {
                let count = link
                    .select(&count_selector)
                    .next()
                    .map(|node| node.text().collect::<String>())
                    .and_then(|value| value.trim().parse::<u32>().ok());
                let raw = link.text().collect::<String>().trim().to_string();
                let name = match count {
                    Some(count) => raw
                        .trim_end_matches(count.to_string().as_str())
                        .trim()
                        .to_string(),
                    None => raw,
                };
                (!name.is_empty()).then_some(PokedataDivision { name, count })
            })
            .collect();
    }
    out
}

fn parse_pokedata_teams(html: &str) -> Vec<PokedataTeam> {
    let document = Html::parse_document(html);
    let Ok(row_selector) = Selector::parse("tbody.pl") else {
        return Vec::new();
    };
    let Ok(placement_selector) = Selector::parse("td.rk") else {
        return Vec::new();
    };
    let Ok(record_selector) = Selector::parse("td.sc") else {
        return Vec::new();
    };
    let Ok(pokemon_selector) = Selector::parse("td.lst img[title]") else {
        return Vec::new();
    };
    let record_re = Regex::new(r"\b\d+-\d+-\d+\b").ok();
    let placement_re = Regex::new(r"\d+").ok();
    document
        .select(&row_selector)
        .filter_map(|row| {
            let player_name = row
                .value()
                .attr("data-n")
                .map(str::trim)
                .filter(|name| !name.is_empty())?
                .to_string();
            let country = row
                .value()
                .attr("data-c")
                .map(str::trim)
                .filter(|code| code.len() == 2)
                .map(str::to_uppercase);
            let placement = row
                .select(&placement_selector)
                .next()
                .map(|node| node.text().collect::<String>())
                .and_then(|text| {
                    placement_re
                        .as_ref()
                        .and_then(|re| re.find(&text))
                        .and_then(|found| found.as_str().parse::<u32>().ok())
                });
            let record = row
                .select(&record_selector)
                .next()
                .map(|node| node.text().collect::<String>())
                .and_then(|text| {
                    record_re
                        .as_ref()
                        .and_then(|re| re.find(&text))
                        .map(|found| found.as_str().to_string())
                });
            let pokemon = row
                .select(&pokemon_selector)
                .filter_map(|image| {
                    let title = image.value().attr("title")?.trim();
                    let mut lines = title.lines().map(str::trim).filter(|line| !line.is_empty());
                    let raw_name = lines.next()?;
                    let item = lines.next().map(str::to_string);
                    let _nature = lines.next();
                    let moves = lines
                        .next()
                        .map(|line| {
                            line.split('/')
                                .map(str::trim)
                                .filter(|move_name| !move_name.is_empty())
                                .map(str::to_string)
                                .collect::<Vec<_>>()
                        })
                        .unwrap_or_default();
                    let sprite_url = absolute_pokedata_sprite(image.value().attr("src")?);
                    Some(PokedataTeamPokemon {
                        name: clean_pokedata_species(raw_name),
                        item,
                        moves,
                        sprite_url,
                    })
                })
                .collect::<Vec<_>>();
            if pokemon.is_empty() {
                return None;
            }
            Some(PokedataTeam {
                player_name,
                country,
                placement,
                record,
                pokemon,
            })
        })
        .collect()
}

fn absolute_pokedata_sprite(src: &str) -> String {
    let src = src.trim();
    if src.starts_with("http://") || src.starts_with("https://") {
        return src.to_string();
    }
    let path = src
        .strip_prefix("../")
        .unwrap_or_else(|| src.trim_start_matches('/'));
    format!("https://www.pokedata.ovh/{path}")
}

fn clean_pokedata_species(raw: &str) -> String {
    let trimmed = raw.trim();
    let Some(open) = trimmed.rfind(" [") else {
        return trimmed.to_string();
    };
    if !trimmed.ends_with(']') {
        return trimmed.to_string();
    }
    let base = trimmed[..open].trim();
    let form = trimmed[open + 2..trimmed.len() - 1]
        .trim()
        .strip_suffix(" Form")
        .unwrap_or_else(|| trimmed[open + 2..trimmed.len() - 1].trim())
        .trim();
    match form {
        "Hisuian" | "Alolan" | "Galarian" | "Paldean" | "Kantonian" | "Unovan" => {
            format!("{form} {base}")
        }
        "Wellspring Mask" => "Ogerpon-Wellspring".to_string(),
        "Hearthflame Mask" => "Ogerpon-Hearthflame".to_string(),
        "Cornerstone Mask" => "Ogerpon-Cornerstone".to_string(),
        _ => format!("{base} ({form})"),
    }
}

fn parse_top_cut(html: &str) -> Vec<PokedataTopCutRound> {
    let document = Html::parse_document(html);
    let Ok(bracket_selector) = Selector::parse("details.bracket") else {
        return Vec::new();
    };
    let Some(bracket) = document.select(&bracket_selector).next() else {
        return Vec::new();
    };
    let Ok(column_selector) = Selector::parse("div.bracket-column") else {
        return Vec::new();
    };
    let Ok(title_selector) = Selector::parse("div.column-title") else {
        return Vec::new();
    };
    let Ok(match_selector) = Selector::parse("div.match-card-node") else {
        return Vec::new();
    };
    let Ok(row_selector) = Selector::parse("div.node-player-row") else {
        return Vec::new();
    };
    bracket
        .select(&column_selector)
        .filter_map(|column| {
            let label = column
                .select(&title_selector)
                .next()
                .map(|title| title.text().collect::<String>().trim().to_string())
                .filter(|label| !label.is_empty())?;
            let matches = column
                .select(&match_selector)
                .filter_map(|match_node| {
                    let mut winner = None;
                    let mut loser = None;
                    for row in match_node.select(&row_selector) {
                        let is_winner = row
                            .value()
                            .attr("class")
                            .is_some_and(|class| class.split_whitespace().any(|c| c == "winner"));
                        let player = top_cut_player(row)?;
                        if is_winner {
                            winner = Some(player);
                        } else {
                            loser = Some(player);
                        }
                    }
                    Some(PokedataTopCutMatch {
                        winner: winner?,
                        loser: loser?,
                    })
                })
                .collect::<Vec<_>>();
            (!matches.is_empty()).then_some(PokedataTopCutRound { label, matches })
        })
        .collect()
}

fn top_cut_player(row: ElementRef<'_>) -> Option<PokedataTopCutPlayer> {
    let name_selector = Selector::parse("span.node-name").ok()?;
    let seed_selector = Selector::parse("span.node-seed").ok()?;
    let flag_selector = Selector::parse("img.node-flag").ok()?;
    let name = row
        .select(&name_selector)
        .next()
        .map(|name| name.text().collect::<String>().trim().to_string())
        .filter(|name| !name.is_empty())?;
    let seed = row
        .select(&seed_selector)
        .next()
        .map(|seed| seed.text().collect::<String>())
        .and_then(|seed| seed.trim().trim_start_matches('#').parse::<u32>().ok());
    let country = row
        .select(&flag_selector)
        .next()
        .and_then(|flag| flag.value().attr("src"))
        .and_then(|src| src.rsplit('/').next())
        .and_then(|file| file.strip_suffix(".svg"))
        .filter(|code| code.len() == 2)
        .map(str::to_uppercase);
    Some(PokedataTopCutPlayer {
        name,
        seed,
        country,
    })
}

#[derive(Deserialize)]
struct PokedataJson {
    #[serde(default)]
    tournament: PokedataJsonTournament,
    #[serde(default)]
    standings: PokedataJsonStandings,
}

#[derive(Deserialize, Default)]
struct PokedataJsonTournament {
    #[serde(default)]
    day1: Option<u32>,
    #[serde(default)]
    day2: Option<u32>,
}

#[derive(Deserialize, Default)]
struct PokedataJsonStandings {
    #[serde(default)]
    players: Vec<PokedataJsonPlayer>,
}

#[derive(Deserialize)]
struct PokedataJsonPlayer {
    #[serde(default)]
    n: String,
    #[serde(default)]
    c: Option<String>,
    #[serde(default)]
    s: Vec<u32>,
    #[serde(default)]
    i: i64,
    #[serde(default)]
    r: Vec<Vec<Value>>,
    #[serde(default)]
    top_cut_elim_round: Option<i32>,
    #[serde(default)]
    top_cut_seed: Option<u32>,
}

fn str_field(value: &Value, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|text| !text.is_empty())
        .map(str::to_string)
}

fn f64_field(value: &Value, key: &str) -> Option<f64> {
    value.get(key).and_then(|entry| {
        entry
            .as_f64()
            .or_else(|| entry.as_str().and_then(|text| text.trim().parse().ok()))
    })
}

fn to_event(value: &Value, from: NaiveDate, to: NaiveDate) -> Option<PokedataEvent> {
    let date = str_field(value, "date")?;
    let parsed = NaiveDate::parse_from_str(&date, "%Y-%m-%d").ok()?;
    if parsed < from || parsed > to {
        return None;
    }
    let name = str_field(value, "name").or_else(|| str_field(value, "Name"))?;
    let id = str_field(value, "guid")
        .or_else(|| str_field(value, "Guid"))
        .or_else(|| str_field(value, "Display_id"))
        .unwrap_or_else(|| format!("{date}-{name}"));
    Some(PokedataEvent {
        id,
        name,
        date,
        time: str_field(value, "time"),
        kind: str_field(value, "type"),
        city: str_field(value, "city"),
        country: str_field(value, "country_code").or_else(|| str_field(value, "country")),
        venue: str_field(value, "shop"),
        url: str_field(value, "pokemon_url")
            .or_else(|| str_field(value, "Event_website"))
            .or_else(|| str_field(value, "Third_party_registration_website")),
        street_address: str_field(value, "street_address"),
        state: str_field(value, "state"),
        postal_code: str_field(value, "postal_code"),
        latitude: f64_field(value, "latitude"),
        longitude: f64_field(value, "longitude"),
        contact_email: str_field(value, "contact_email"),
        contact_phone: str_field(value, "contact_phone"),
        details: str_field(value, "Details"),
        registration_start: str_field(value, "Registration_start"),
        registration_end: str_field(value, "Registration_end"),
        admission: str_field(value, "Admission"),
        event_website: str_field(value, "Event_website"),
        third_party_registration_website: str_field(value, "Third_party_registration_website"),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_the_official_event_locator_payload() {
        let value: Value = serde_json::json!({
            "events": [{
                "type": "League Challenge",
                "name": "League Challenge Spells VGC",
                "date": "2026-11-28",
                "time": "15:00:00",
                "shop": "SPELLS TCG",
                "street_address": "AV. LIBERTAD 123, VINA DEL MAR",
                "state": "Valparaiso",
                "postal_code": "2520000",
                "city": "Vina del Mar",
                "country_code": "CL",
                "latitude": "-33.0245",
                "longitude": "-71.5518",
                "contact_email": "events@spells.cl",
                "contact_phone": "+56 32 123 4567",
                "Details": "Registration opens at 14:30.",
                "Registration_start": "2026-11-28 14:30:00",
                "Registration_end": "2026-11-28 15:00:00",
                "Admission": "5000 CLP",
                "Event_website": "https://example.com/event",
                "pokemon_url": "https://www.pokemon.com/us/play-pokemon-tournaments/26-11-003470/",
                "guid": "abc-123"
            }]
        });
        let from = NaiveDate::from_ymd_opt(2026, 11, 21).unwrap();
        let to = NaiveDate::from_ymd_opt(2026, 12, 21).unwrap();
        let events: Vec<_> = value["events"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(|event| to_event(event, from, to))
            .collect();
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].id, "abc-123");
        assert_eq!(events[0].country.as_deref(), Some("CL"));
        assert_eq!(events[0].kind.as_deref(), Some("League Challenge"));
        assert_eq!(
            events[0].street_address.as_deref(),
            Some("AV. LIBERTAD 123, VINA DEL MAR")
        );
        assert_eq!(events[0].latitude, Some(-33.0245));
        assert_eq!(events[0].contact_email.as_deref(), Some("events@spells.cl"));
        assert!(events[0].url.as_deref().unwrap().contains("26-11-003470"));
    }

    #[test]
    fn drops_events_outside_the_window() {
        let value = serde_json::json!({
            "name": "Old event",
            "date": "2026-10-01",
            "guid": "old"
        });
        assert!(to_event(
            &value,
            NaiveDate::from_ymd_opt(2026, 11, 21).unwrap(),
            NaiveDate::from_ymd_opt(2026, 12, 21).unwrap(),
        )
        .is_none());
    }

    #[test]
    fn matches_the_vgc_laic_and_ignores_tcg() {
        let html = r#"
        <div class="tournament tcg"><div class="title">2027 Latin America Pokémon TCG International Championships</div><div class="dates">November 20-22, 2026</div><form><input type="hidden" name="id" value="1000087"></form></div>
        <div class="tournament vg"><div class="title">2027 Latin America Pokémon VGC International Championships</div><div class="dates">November 20-22, 2026</div><form><input type="hidden" name="id" value="1000088"></form></div>
        "#;
        let event = parse_tournament_list(
            html,
            "2027 Pokémon Latin America International Championships",
            NaiveDate::from_ymd_opt(2026, 11, 20),
        )
        .expect("LAIC");
        assert_eq!(event.id, "1000088");
        assert_eq!(event.date, NaiveDate::from_ymd_opt(2026, 11, 20));
        assert!(event.page_url.ends_with("/1000088/Masters"));
    }

    #[test]
    fn parses_the_server_rendered_top_cut_bracket() {
        let html = r#"
        <details class="bracket" open>
          <summary>Top Cut</summary>
          <div class="bracket-flow">
            <div class="bracket-column">
              <div class="column-title">Top 8</div>
              <div class="matchups">
                <div class="match-card-node">
                  <div class="node-player-row winner"><span class="node-seed">#1</span><img class="node-flag" src="https://pokedata.ovh/flags/JP.svg"><span class="node-name">Kandai Nagatome</span></div>
                  <div class="node-player-row loser"><span class="node-seed">#8</span><img class="node-flag" src="https://pokedata.ovh/flags/US.svg"><span class="node-name">Rohan Muthukumar</span></div>
                </div>
              </div>
            </div>
            <div class="bracket-column">
              <div class="column-title">Finals</div>
              <div class="matchups">
                <div class="match-card-node">
                  <div class="node-player-row winner"><span class="node-seed">#1</span><img class="node-flag" src="https://pokedata.ovh/flags/JP.svg"><span class="node-name">Kandai Nagatome</span></div>
                  <div class="node-player-row loser"><span class="node-seed">#16</span><span class="node-name muted-text">BYE</span></div>
                </div>
              </div>
            </div>
          </div>
        </details>
        "#;
        let rounds = parse_top_cut(html);
        assert_eq!(rounds.len(), 2);
        assert_eq!(rounds[0].label, "Top 8");
        assert_eq!(rounds[0].matches[0].winner.name, "Kandai Nagatome");
        assert_eq!(rounds[0].matches[0].winner.seed, Some(1));
        assert_eq!(rounds[0].matches[0].winner.country.as_deref(), Some("JP"));
        assert_eq!(rounds[1].matches[0].loser.name, "BYE");
        assert_eq!(rounds[1].matches[0].loser.seed, Some(16));
        assert_eq!(rounds[1].matches[0].loser.country, None);
    }

    #[test]
    fn accepts_negative_top_cut_markers_and_computes_swiss_rounds() {
        let payload: PokedataJson = serde_json::from_str(
            r#"{
                "tournament": {"day1": 8, "day2": 4},
                "standings": {"players": [{
                    "n": "Emilio Forbes",
                    "c": "US",
                    "s": [14,2,0],
                    "i": 619,
                    "r": [[618,0,410],[-1,3,null]],
                    "top_cut_elim_round": -1
                }]}
            }"#,
        )
        .expect("negative top-cut markers must deserialize");
        assert_eq!(swiss_rounds(&payload), Some(12));
        assert_eq!(payload.standings.players[0].top_cut_elim_round, Some(-1));
    }

    #[test]
    fn parses_the_server_rendered_teams_and_divisions() {
        let teams_html = r#"
        <table><tbody class="pl" data-n="Kyle Livinghouse" data-c="US" data-pokemon="sneasler|charizard">
          <tr class="row"><td class="rk g1">1</td><td class="sc"><span>13</span>-<span>2</span>-<span>0</span></td>
          <td class="lst"><span class="sprite-wrap">
            <img src="../misc/sprites-master/sprites/pokemon/903.png" title="Sneasler&#10;White Herb&#10;Adamant&#10;Close Combat/Protect">
            <img src="../misc/sprites-master/sprites/pokemon/6.png" title="Charizard&#10;Charizardite Y&#10;Modest&#10;Heat Wave/Protect">
          </span></td></tr>
        </tbody>
        <tbody class="pl" data-n="Renzo Navarro" data-c="PE">
          <tr><td class="rk">2</td><td class="sc">12-3-0</td>
          <td class="lst"><img src="../misc/sprites-master/sprites/pokemon/10230.png" title="Arcanine [Hisuian Form]&#10;Focus Sash&#10;Jolly&#10;Flare Blitz/Protect"></td></tr>
        </tbody></table>
        "#;
        let teams = parse_pokedata_teams(teams_html);
        assert_eq!(teams.len(), 2);
        assert_eq!(teams[0].player_name, "Kyle Livinghouse");
        assert_eq!(teams[0].placement, Some(1));
        assert_eq!(teams[0].record.as_deref(), Some("13-2-0"));
        assert_eq!(teams[0].pokemon[0].name, "Sneasler");
        assert_eq!(teams[0].pokemon[0].item.as_deref(), Some("White Herb"));
        assert_eq!(teams[0].pokemon[0].moves, vec!["Close Combat", "Protect"]);
        assert_eq!(
            teams[0].pokemon[0].sprite_url,
            "https://www.pokedata.ovh/misc/sprites-master/sprites/pokemon/903.png"
        );
        assert_eq!(teams[1].pokemon[0].name, "Hisuian Arcanine");

        let divisions = parse_divisions(
            r#"<div class="division"><div class="name">Junior-Senior</div><span class="div-count-badge">7</span></div>"#,
        );
        assert_eq!(divisions.len(), 1);
        assert_eq!(divisions[0].name, "Junior-Senior");
        assert_eq!(divisions[0].count, Some(7));
    }

    #[test]
    fn derives_a_top_cut_when_the_page_has_no_bracket() {
        let payload: PokedataJson = serde_json::from_str(
            r#"{
                "tournament": {"day1": 1, "day2": 0},
                "standings": {"players": [
                    {"n":"Kiran Singh","c":"AU","s":[2,0,0],"i":1,"top_cut_seed":1,"r":[[9,3,0],[2,3,0]]},
                    {"n":"Haruki Sato","c":"JP","s":[1,1,0],"i":2,"top_cut_seed":2,"r":[[8,3,0],[1,0,0]]}
                ]}
            }"#,
        )
        .unwrap();
        let rounds = derive_top_cut_from_json(&payload);
        assert_eq!(rounds.len(), 1);
        assert_eq!(rounds[0].label, "Finals");
        assert_eq!(rounds[0].matches.len(), 1);
        assert_eq!(rounds[0].matches[0].winner.name, "Kiran Singh");
        assert_eq!(rounds[0].matches[0].loser.name, "Haruki Sato");
    }

    #[test]
    fn maps_pokedata_standings_and_tolerates_missing_records() {
        let payload: PokedataJson = serde_json::from_str(
            r#"{"standings":{"players":[
                {"n":"Masahiro Taoka","c":"jp","s":[14,2,0]},
                {"n":"Emilio Forbes","c":"US","s":[]},
                {"n":"  ","c":"BR","s":[1,1,0]}
            ]}}"#,
        )
        .unwrap();
        let players = payload
            .standings
            .players
            .iter()
            .enumerate()
            .filter_map(|(index, player)| {
                let player_name = player.n.trim();
                if player_name.is_empty() {
                    return None;
                }
                let wins = *player.s.first().unwrap_or(&0);
                let losses = *player.s.get(1).unwrap_or(&0);
                let ties = *player.s.get(2).unwrap_or(&0);
                Some(PokedataStanding {
                    place: index as u32 + 1,
                    player_name: player_name.to_string(),
                    country: player.c.as_deref().map(str::to_uppercase),
                    wins,
                    losses,
                    ties,
                    record: (wins + losses + ties > 0).then(|| format!("{wins}-{losses}-{ties}")),
                    matches: Vec::new(),
                })
            })
            .collect::<Vec<_>>();
        assert_eq!(players.len(), 2);
        assert_eq!(players[0].place, 1);
        assert_eq!(players[0].country.as_deref(), Some("JP"));
        assert_eq!(players[0].record.as_deref(), Some("14-2-0"));
        assert_eq!(players[1].record, None);
    }
}
