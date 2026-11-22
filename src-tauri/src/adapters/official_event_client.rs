use crate::adapters::HttpClient;
use crate::config;
use crate::domain::OfficialEventDetails;
use crate::error::AppError;
use regex::Regex;
use scraper::{Html, Selector};
use serde_json::Value;
use std::sync::Arc;

/// The official event pages block embedded iframes with an anti-bot page. A
/// normal server-side request usually works, so we read the page once and show
/// its structured data in the event card instead of embedding it.
const JINA_READER: &str = "https://r.jina.ai/http://";
const JINA_HEADERS: &[(&str, &str)] = &[
    ("Accept", "text/plain, text/markdown;q=0.9, */*;q=0.8"),
    ("Accept-Language", "en-US,en;q=0.9"),
    (
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 \
         (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    ),
];

const HEADERS: &[(&str, &str)] = &[
    (
        "Accept",
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    ),
    ("Accept-Language", "en-US,en;q=0.9"),
    (
        "Referer",
        "https://www.pokemon.com/us/play-pokemon/pokemon-events/find-an-event/",
    ),
    ("Upgrade-Insecure-Requests", "1"),
    ("Sec-Fetch-Dest", "document"),
    ("Sec-Fetch-Mode", "navigate"),
    ("Sec-Fetch-Site", "none"),
    ("Sec-Fetch-User", "?1"),
    ("Cache-Control", "max-age=0"),
    (
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 \
         (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    ),
];

#[derive(Clone)]
pub struct OfficialEventClient {
    http: Arc<HttpClient>,
}

impl OfficialEventClient {
    pub fn new(http: Arc<HttpClient>) -> Self {
        Self { http }
    }

    /// Best-effort extra details for one official event page.
    pub async fn details(&self, url: &str) -> Result<OfficialEventDetails, AppError> {
        let url = url.trim();
        if !is_official_event_url(url) {
            return Err(AppError::Validation(
                "not an official Play! Pokémon event URL".into(),
            ));
        }
        match self.direct_details(url).await {
            Ok(details) => Ok(details),
            Err(error) => {
                tracing::warn!(%error, url, "direct event page failed; using reader fallback");
                self.reader_details(url).await
            }
        }
    }

    async fn direct_details(&self, url: &str) -> Result<OfficialEventDetails, AppError> {
        let bytes = self
            .http
            .get_cached_with_headers(url, HEADERS, config::TTL_OFFICIAL_EVENT)
            .await?;
        let html = String::from_utf8_lossy(&bytes);
        if is_blocked(&html) {
            // Never keep the anti-bot page in the cache: a later open can
            // succeed once the rate limit resets.
            let _ = self.http.remove_cached(url);
            return Err(AppError::Validation(
                "the official event page is temporarily blocking requests".into(),
            ));
        }
        parse_details(&html).ok_or_else(|| {
            AppError::Validation("the official event page has no readable details".into())
        })
    }

    /// Public reader fallback. The official site fingerprints plain HTTP
    /// clients, but this endpoint renders the same page in a browser-like
    /// reader and returns readable text, so users still get organizer, phone,
    /// category and website instead of an empty card.
    async fn reader_details(&self, url: &str) -> Result<OfficialEventDetails, AppError> {
        let target = url
            .trim_start_matches("https://")
            .trim_start_matches("http://");
        let reader_url = format!("{JINA_READER}{target}");
        let bytes = self
            .http
            .get_cached_with_headers(&reader_url, JINA_HEADERS, config::TTL_OFFICIAL_EVENT)
            .await?;
        let markdown = String::from_utf8_lossy(&bytes);
        parse_reader_markdown(&markdown).ok_or_else(|| {
            AppError::Validation("the event reader returned no readable details".into())
        })
    }
}

fn is_official_event_url(url: &str) -> bool {
    reqwest::Url::parse(url).ok().is_some_and(|parsed| {
        matches!(
            parsed.host_str(),
            Some("www.pokemon.com") | Some("pokemon.com")
        ) && parsed.path().contains("play-pokemon-tournaments")
    })
}

fn is_blocked(html: &str) -> bool {
    html.contains("Pardon Our Interruption")
        || html.contains("Request unsuccessful. Incapsula")
        || html.contains("_Incapsula_Resource")
}

fn clean_text(value: &str) -> String {
    value
        .replace('\u{a0}', " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn non_empty(value: &str) -> Option<String> {
    let value = clean_text(value);
    if value.is_empty() {
        None
    } else {
        Some(value)
    }
}

fn set_if_empty(target: &mut Option<String>, value: Option<String>) {
    if target.is_none() {
        *target = value;
    }
}

fn append(target: &mut Option<String>, value: Option<String>, separator: &str) {
    let Some(value) = value else { return };
    match target {
        Some(current) if !current.contains(&value) => {
            current.push_str(separator);
            current.push_str(&value);
        }
        None => *target = Some(value),
        _ => {}
    }
}

fn strip_scripts(html: &str) -> String {
    Regex::new(r"(?is)<script\b[^>]*>.*?</script>|<style\b[^>]*>.*?</style>")
        .ok()
        .map(|re| re.replace_all(html, " ").into_owned())
        .unwrap_or_else(|| html.to_string())
}

fn json_ld(html: &str) -> Option<Value> {
    let re =
        Regex::new(r#"(?is)<script[^>]*type=["']application/ld\+json["'][^>]*>(.*?)</script>"#)
            .ok()?;
    let found = re
        .captures_iter(html)
        .filter_map(|capture| capture.get(1))
        .filter_map(|raw| serde_json::from_str::<Value>(raw.as_str()).ok())
        .find(|value| {
            value
                .get("@type")
                .and_then(Value::as_str)
                .is_some_and(|kind| kind.contains("Event"))
        });
    found
}

fn value_str(value: &Value, key: &str) -> Option<String> {
    value.get(key).and_then(Value::as_str).and_then(non_empty)
}

fn fill_from_json_ld(details: &mut OfficialEventDetails, value: &Value) {
    if let Some(location) = value.get("location") {
        set_if_empty(
            &mut details.venue,
            value_str(location, "name").or_else(|| {
                location
                    .get("address")
                    .and_then(|address| value_str(address, "name"))
            }),
        );
        if let Some(address) = location.get("address") {
            set_if_empty(
                &mut details.address_line1,
                value_str(address, "streetAddress"),
            );
            set_if_empty(&mut details.city, value_str(address, "addressLocality"));
            set_if_empty(&mut details.state, value_str(address, "addressRegion"));
            set_if_empty(&mut details.postal_code, value_str(address, "postalCode"));
            set_if_empty(&mut details.country, value_str(address, "addressCountry"));
        }
        if let Some(geo) = location.get("geo") {
            if details.latitude.is_none() {
                details.latitude = geo.get("latitude").and_then(|v| {
                    v.as_f64()
                        .or_else(|| v.as_str().and_then(|s| s.trim().parse().ok()))
                });
            }
            if details.longitude.is_none() {
                details.longitude = geo.get("longitude").and_then(|v| {
                    v.as_f64()
                        .or_else(|| v.as_str().and_then(|s| s.trim().parse().ok()))
                });
            }
        }
    }
    set_if_empty(
        &mut details.details,
        value_str(value, "description").filter(|text| text.len() > 8),
    );
    if details.admission.is_none() {
        if let Some(offer) = value.get("offers") {
            let price = offer.get("price").and_then(|price| {
                price
                    .as_f64()
                    .map(|n| {
                        if n.fract() == 0.0 {
                            format!("{n:.0}")
                        } else {
                            format!("{n:.2}")
                        }
                    })
                    .or_else(|| price.as_str().map(str::to_string))
            });
            let currency = value_str(offer, "priceCurrency");
            details.admission = match (price, currency) {
                (Some(price), Some(currency)) => Some(format!("{price} {currency}")),
                (Some(price), None) => Some(price),
                _ => None,
            };
        }
    }
}

fn parse_details(html: &str) -> Option<OfficialEventDetails> {
    let mut details = OfficialEventDetails::default();
    if let Some(value) = json_ld(html) {
        fill_from_json_ld(&mut details, &value);
    }

    let cleaned = strip_scripts(html);
    let doc = Html::parse_document(&cleaned);
    let li_selector = Selector::parse("li").ok()?;
    let label_selector = Selector::parse("label").ok()?;
    let link_selector = Selector::parse("a[href]").ok()?;

    for item in doc.select(&li_selector) {
        let Some(label_element) = item.select(&label_selector).next() else {
            continue;
        };
        let label = clean_text(&label_element.text().collect::<String>());
        if label.is_empty() {
            continue;
        }
        let mut raw = clean_text(&item.text().collect::<Vec<_>>().join(" "));
        if let Some(rest) = raw.strip_prefix(&label) {
            raw = rest.trim().to_string();
        }
        let value = non_empty(&raw);

        match label.as_str() {
            "Tournament ID" => set_if_empty(&mut details.tournament_id, value),
            "Category" => set_if_empty(&mut details.category, value),
            "Premier Event" => set_if_empty(&mut details.premier_event, value),
            "Status" => set_if_empty(&mut details.status, value),
            "Organizer Name" => set_if_empty(&mut details.organizer_name, value),
            "Organizer Phone" => set_if_empty(&mut details.organizer_phone, value),
            "Organizer Email" => {
                let email = item
                    .select(&link_selector)
                    .filter_map(|link| link.value().attr("href"))
                    .find_map(|href| href.strip_prefix("mailto:"))
                    .map(|email| email.split('?').next().unwrap_or(email))
                    .and_then(non_empty);
                set_if_empty(&mut details.organizer_email, email);
            }
            "Venue Name" => set_if_empty(&mut details.venue, value),
            "Address Line 1" => set_if_empty(&mut details.address_line1, value),
            "Address Line 2" => set_if_empty(&mut details.address_line2, value),
            "City" => set_if_empty(&mut details.city, value),
            "Province/State" => set_if_empty(&mut details.state, value),
            "Postal/Zip Code" => set_if_empty(&mut details.postal_code, value),
            "Country/Region" => set_if_empty(&mut details.country, value),
            "Website" => {
                let href = item
                    .select(&link_selector)
                    .filter_map(|link| link.value().attr("href"))
                    .filter(|href| href.starts_with("http"))
                    .find(|href| !href.contains("recaptcha"))
                    .and_then(non_empty);
                set_if_empty(&mut details.website, href.or(value));
            }
            "Admission" | "Admission Fee" | "Entry Fee" => {
                set_if_empty(&mut details.admission, value)
            }
            "Registration" | "Registration Time" | "Registration Start" | "Registration End" => {
                append(&mut details.registration, value, " → ")
            }
            "Details" | "Tournament Details" | "Additional Details" | "Description" => {
                append(&mut details.details, value, "\n")
            }
            _ => {}
        }
    }

    if details.tournament_id.is_none()
        && details.venue.is_none()
        && details.organizer_name.is_none()
        && details.address_line1.is_none()
    {
        return None;
    }
    Some(details)
}

fn reader_field(markdown: &str, label: &str) -> Option<String> {
    let pattern = format!(r"(?m)^\s*(?:\d+\.\s*)?{}\s+(.+?)\s*$", regex::escape(label));
    let re = Regex::new(&pattern).ok()?;
    re.captures(markdown)
        .and_then(|capture| capture.get(1))
        .and_then(|value| non_empty(value.as_str()))
}

fn first_url(value: &str) -> Option<String> {
    let re = Regex::new(r#"https?://[^\s)\]"<>]+"#).ok()?;
    re.find(value)
        .map(|found| found.as_str().trim_end_matches(['.', ',', ';']).to_string())
}

fn parse_reader_markdown(markdown: &str) -> Option<OfficialEventDetails> {
    let details = OfficialEventDetails {
        tournament_id: reader_field(markdown, "Tournament ID"),
        category: reader_field(markdown, "Category"),
        premier_event: reader_field(markdown, "Premier Event"),
        status: reader_field(markdown, "Status"),
        organizer_name: reader_field(markdown, "Organizer Name"),
        organizer_phone: reader_field(markdown, "Organizer Phone"),
        organizer_email: reader_field(markdown, "Organizer Email").and_then(|value| {
            if value.contains('@') {
                Some(value)
            } else {
                None
            }
        }),
        venue: reader_field(markdown, "Venue Name"),
        address_line1: reader_field(markdown, "Address Line 1"),
        address_line2: reader_field(markdown, "Address Line 2"),
        city: reader_field(markdown, "City"),
        state: reader_field(markdown, "Province/State"),
        postal_code: reader_field(markdown, "Postal/Zip Code"),
        country: reader_field(markdown, "Country/Region"),
        website: reader_field(markdown, "Website").and_then(|value| first_url(&value)),
        admission: reader_field(markdown, "Admission"),
        registration: reader_field(markdown, "Registration"),
        details: reader_field(markdown, "Details"),
        ..OfficialEventDetails::default()
    };
    if details.tournament_id.is_none()
        && details.venue.is_none()
        && details.organizer_name.is_none()
        && details.address_line1.is_none()
    {
        return None;
    }
    Some(details)
}

#[cfg(test)]
mod tests {
    use super::*;

    const PAGE: &str = r#"
      <html><body>
      <h2>Tournament Details: 26-11-012594</h2>
      <ul>
        <li><label>Tournament ID</label>26-11-012594</li>
        <li><label>Category</label>VG - Standard</li>
        <li><label>Organizer Name</label>Anibal Fuentes</li>
        <li><label>Organizer Phone</label>+56984931774</li>
        <li><label>Organizer Email</label><a href="mailto:events@example.com">Contact</a></li>
        <li><label>Venue Name</label>THE BIG BOX</li>
        <li><label>Address Line 1</label>196 STA. LUCÍA</li>
        <li><label>Address Line 2</label>(AGUSTINAS ESQUINA SANTA LUCIA)</li>
        <li><label>City</label>SANTIAGO</li>
        <li><label>Province/State</label>REGIÓN METROPOLITANA</li>
        <li><label>Country/Region</label>Chile</li>
        <li><label>Website</label><a href="http://www.thebigbox.cl/">www.thebigbox.cl</a></li>
      </ul>
      <script type="application/ld+json">
      {"@type":"Event","location":{"name":"THE BIG BOX","address":{
        "streetAddress":"196 STA. LUCÍA, (AGUSTINAS ESQUINA SANTA LUCIA)",
        "addressLocality":"SANTIAGO","addressRegion":"REGIÓN METROPOLITANA",
        "addressCountry":"CL"}},
        "offers":{"price":2990.0,"priceCurrency":"CLP"}}
      </script>
      </body></html>
    "#;

    #[test]
    fn parses_the_official_event_fields() {
        let details = parse_details(PAGE).unwrap();
        assert_eq!(details.tournament_id.as_deref(), Some("26-11-012594"));
        assert_eq!(details.organizer_name.as_deref(), Some("Anibal Fuentes"));
        assert_eq!(details.organizer_phone.as_deref(), Some("+56984931774"));
        assert_eq!(
            details.organizer_email.as_deref(),
            Some("events@example.com")
        );
        assert_eq!(details.venue.as_deref(), Some("THE BIG BOX"));
        assert_eq!(details.city.as_deref(), Some("SANTIAGO"));
        assert_eq!(details.country.as_deref(), Some("CL"));
        assert_eq!(details.website.as_deref(), Some("http://www.thebigbox.cl/"));
        assert_eq!(details.admission.as_deref(), Some("2990 CLP"));
    }

    #[test]
    fn rejects_a_non_official_url() {
        assert!(!is_official_event_url("https://example.com/event"));
        assert!(!is_official_event_url(
            "https://www.pokemon.com/us/play-pokemon/pokemon-events/"
        ));
        assert!(is_official_event_url(
            "https://www.pokemon.com/us/pokemon-trainer-club/play-pokemon-tournaments/26-11-012594/"
        ));
    }

    #[test]
    fn detects_the_anti_bot_page() {
        assert!(is_blocked("<title>Pardon Our Interruption</title>"));
        assert!(!is_blocked("<title>Pokémon Trainer Club</title>"));
    }

    #[test]
    fn parses_the_reader_markdown_fallback() {
        let markdown = r#"
## Tournament Details: 26-11-012594

1.   Tournament ID 26-11-012594
2.   Category VG - Standard
3.   Premier Event (2027) VGC League Challenge November
4.   Status Sanctioned

### Organizer Information

1.   Organizer Name Anibal Fuentes
2.   Organizer Phone +56984931774
3.   Organizer Email [Contact this organizer](https://example.test/)

### Location information

1.   Venue Name THE BIG BOX
2.   Address Line 1 196 STA. LUCÍA
3.   Address Line 2 (AGUSTINAS ESQUINA SANTA LUCIA)
4.   City SANTIAGO
5.   Province/State REGIÓN METROPOLITANA
6.   Country/Region Chile
7.   Website [http://www.thebigbox.cl/](https://example.test/)
"#;
        let details = parse_reader_markdown(markdown).unwrap();
        assert_eq!(details.tournament_id.as_deref(), Some("26-11-012594"));
        assert_eq!(details.organizer_name.as_deref(), Some("Anibal Fuentes"));
        assert_eq!(details.organizer_phone.as_deref(), Some("+56984931774"));
        assert_eq!(details.category.as_deref(), Some("VG - Standard"));
        assert_eq!(
            details.premier_event.as_deref(),
            Some("(2027) VGC League Challenge November")
        );
        assert_eq!(details.status.as_deref(), Some("Sanctioned"));
        assert_eq!(details.venue.as_deref(), Some("THE BIG BOX"));
        assert_eq!(details.city.as_deref(), Some("SANTIAGO"));
        assert_eq!(details.state.as_deref(), Some("REGIÓN METROPOLITANA"));
        assert_eq!(details.country.as_deref(), Some("Chile"));
        assert_eq!(details.website.as_deref(), Some("http://www.thebigbox.cl/"));
        assert!(details.organizer_email.is_none());
    }
}
