use crate::adapters::HttpClient;
use crate::config;
use crate::error::AppError;
use chrono::NaiveDate;
use serde_json::Value;
use std::sync::Arc;

/// Public mirror of the official Play! Pokémon Event Locator. It exposes the
/// upcoming VG League Challenges and Cups, including venue and country, which
/// the Limitless API does not have. The endpoint is undocumented, so failures
/// are isolated to the upcoming panel and never break the rest of the app.
const POKEDATA_BASE: &str = "https://pokedata.ovh/events/apiv2";

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
}
