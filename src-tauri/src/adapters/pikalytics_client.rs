use crate::adapters::sprite_resolver::{canonical_display_name, canonical_id, primary_sprite_url};
use crate::adapters::HttpClient;
use crate::config;
use crate::domain::pikalytics::{
    PikalyticsEntry, PikalyticsEvSpread, PikalyticsItem, PikalyticsTeammate,
};
use crate::error::AppError;
use scraper::{ElementRef, Html, Selector};

/// Pikalytics does not publish an API. We scrape the Regulation H doubles
/// page, which is the closest public equivalent to Reg M for doubles usage
/// data. The parser degrades gracefully: any missing section returns empty,
/// it never panics on selector misses.
#[derive(Clone)]
pub struct PikalyticsClient {
    http: HttpClient,
}

impl PikalyticsClient {
    pub fn new(http: HttpClient) -> Self {
        Self { http }
    }

    pub async fn fetch_entry(
        &self,
        species: &str,
        lang: &str,
    ) -> Result<PikalyticsEntry, AppError> {
        let species_id = canonical_id(species);
        let display = canonical_display_name(species);
        let url = build_url(&species_id, lang);
        let bytes = self.http.get_cached(&url, config::TTL_PIKALYTICS).await?;
        let html = std::str::from_utf8(&bytes).map_err(|e| {
            AppError::Internal(format!("pikalytics html not utf-8 for {species}: {e}"))
        })?;
        let parsed = parse_entry(html, &species_id, &display, &url);
        Ok(parsed)
    }
}

fn build_url(species_id: &str, lang: &str) -> String {
    let lang_suffix = match lang {
        "es" => "?l=es",
        _ => "",
    };
    format!(
        "{}/pokedex/gen9vgc2024regh/{}{}",
        config::PIKALYTICS_BASE,
        species_id,
        lang_suffix
    )
}

fn parse_entry(html: &str, species_id: &str, species_display: &str, url: &str) -> PikalyticsEntry {
    let doc = Html::parse_document(html);

    PikalyticsEntry {
        species_id: species_id.to_string(),
        species_display: species_display.to_string(),
        sprite_url: Some(primary_sprite_url(species_display)),
        usage_percent: parse_header_usage(&doc),
        common_items: parse_named_section(&doc, "items"),
        common_abilities: parse_named_section(&doc, "abilities"),
        common_moves: parse_named_section(&doc, "moves"),
        common_teammates: parse_teammates(&doc),
        common_tera: parse_named_section(&doc, "tera"),
        ev_spreads: parse_spreads(&doc),
        source_url: url.to_string(),
    }
}

fn parse_header_usage(doc: &Html) -> Option<f32> {
    let sel = Selector::parse(".usage-container .usage, .pokemon-usage, .stat-value").ok()?;
    doc.select(&sel)
        .filter_map(|el| parse_percent(&el.text().collect::<String>()))
        .next()
}

/// Pikalytics organises its detail pages as titled blocks. We look for a block
/// whose heading contains the expected keyword (items, abilities, moves,
/// tera) and then harvest the `<li>` / `.entry` children as name + usage.
fn parse_named_section(doc: &Html, kind: &str) -> Vec<PikalyticsItem> {
    let section_sel = match Selector::parse(".pokemon-section, .block, section") {
        Ok(s) => s,
        Err(_) => return Vec::new(),
    };
    let needle = kind.to_lowercase();

    for section in doc.select(&section_sel) {
        let heading = section_heading(section);
        if !heading.to_lowercase().contains(&needle) {
            continue;
        }
        let items = harvest_items(section);
        if !items.is_empty() {
            return items;
        }
    }
    Vec::new()
}

fn parse_teammates(doc: &Html) -> Vec<PikalyticsTeammate> {
    let section_sel = match Selector::parse(".pokemon-section, .block, section") {
        Ok(s) => s,
        Err(_) => return Vec::new(),
    };
    for section in doc.select(&section_sel) {
        let heading = section_heading(section).to_lowercase();
        if !heading.contains("teammate") && !heading.contains("compañero") {
            continue;
        }
        return harvest_teammates(section);
    }
    Vec::new()
}

fn parse_spreads(doc: &Html) -> Vec<PikalyticsEvSpread> {
    let section_sel = match Selector::parse(".pokemon-section, .block, section") {
        Ok(s) => s,
        Err(_) => return Vec::new(),
    };
    for section in doc.select(&section_sel) {
        let heading = section_heading(section).to_lowercase();
        if !heading.contains("spread") && !heading.contains("reparto") && !heading.contains("ev") {
            continue;
        }
        let row_sel = match Selector::parse("li, .entry, .row") {
            Ok(s) => s,
            Err(_) => continue,
        };
        let mut out = Vec::new();
        for row in section.select(&row_sel) {
            let text = row.text().collect::<String>();
            let trimmed = text.trim();
            if trimmed.is_empty() {
                continue;
            }
            let usage = parse_percent(trimmed);
            let (label, nature) = split_label_nature(trimmed);
            if label.is_empty() {
                continue;
            }
            out.push(PikalyticsEvSpread {
                label,
                usage_percent: usage,
                nature,
            });
            if out.len() >= 10 {
                break;
            }
        }
        if !out.is_empty() {
            return out;
        }
    }
    Vec::new()
}

fn section_heading(section: ElementRef<'_>) -> String {
    let sel = match Selector::parse("h1, h2, h3, h4, .title, .heading") {
        Ok(s) => s,
        Err(_) => return String::new(),
    };
    section
        .select(&sel)
        .map(|el| el.text().collect::<String>())
        .next()
        .unwrap_or_default()
        .trim()
        .to_string()
}

fn harvest_items(section: ElementRef<'_>) -> Vec<PikalyticsItem> {
    let row_sel = match Selector::parse("li, .entry, .row") {
        Ok(s) => s,
        Err(_) => return Vec::new(),
    };
    let mut out = Vec::new();
    for row in section.select(&row_sel) {
        let text = row.text().collect::<String>();
        let trimmed = text.trim();
        if trimmed.is_empty() {
            continue;
        }
        let usage = parse_percent(trimmed);
        let name = strip_percent(trimmed);
        if name.is_empty() {
            continue;
        }
        out.push(PikalyticsItem {
            name,
            usage_percent: usage,
        });
        if out.len() >= 10 {
            break;
        }
    }
    out
}

fn harvest_teammates(section: ElementRef<'_>) -> Vec<PikalyticsTeammate> {
    let row_sel = match Selector::parse("li, .entry, .row") {
        Ok(s) => s,
        Err(_) => return Vec::new(),
    };
    let img_sel = match Selector::parse("img") {
        Ok(s) => s,
        Err(_) => return Vec::new(),
    };
    let mut out = Vec::new();
    for row in section.select(&row_sel) {
        let text = row.text().collect::<String>();
        let trimmed = text.trim();
        if trimmed.is_empty() {
            continue;
        }
        let usage = parse_percent(trimmed);
        let name = strip_percent(trimmed);
        if name.is_empty() {
            continue;
        }
        let sprite = row
            .select(&img_sel)
            .filter_map(|el| el.value().attr("src").map(|s| s.to_string()))
            .next();
        out.push(PikalyticsTeammate {
            species: name,
            usage_percent: usage,
            sprite_url: sprite,
        });
        if out.len() >= 10 {
            break;
        }
    }
    out
}

fn parse_percent(text: &str) -> Option<f32> {
    let start = text.rfind(|c: char| c.is_ascii_digit())?;
    let slice = &text[..=start];
    let num_start = slice
        .rfind(|c: char| !(c.is_ascii_digit() || c == '.' || c == ','))
        .map(|i| i + 1)
        .unwrap_or(0);
    let num = &slice[num_start..];
    let clean = num.replace(',', ".");
    clean.parse::<f32>().ok()
}

fn strip_percent(text: &str) -> String {
    let mut cleaned = text.replace('\n', " ");
    if let Some(idx) = cleaned.find('%') {
        let before = &cleaned[..idx];
        if let Some(num_start) =
            before.rfind(|c: char| !(c.is_ascii_digit() || c == '.' || c == ','))
        {
            cleaned = format!("{}{}", &cleaned[..=num_start], &cleaned[idx + 1..]);
        } else {
            cleaned = cleaned[idx + 1..].to_string();
        }
    }
    cleaned.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn split_label_nature(text: &str) -> (String, Option<String>) {
    let label = strip_percent(text);
    let natures = [
        "Hardy", "Lonely", "Brave", "Adamant", "Naughty", "Bold", "Docile", "Relaxed", "Impish",
        "Lax", "Timid", "Hasty", "Serious", "Jolly", "Naive", "Modest", "Mild", "Quiet", "Bashful",
        "Rash", "Calm", "Gentle", "Sassy", "Careful", "Quirky",
    ];
    for n in natures {
        if label.contains(n) {
            let cleaned = label.replace(n, "").trim().to_string();
            return (cleaned, Some(n.to_string()));
        }
    }
    (label, None)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_percent_recovers_from_trailing_symbol() {
        assert!((parse_percent("Choice Scarf 44.2%").unwrap() - 44.2).abs() < 0.01);
    }

    #[test]
    fn strip_percent_removes_inline_usage() {
        assert_eq!(strip_percent("Protect 61.3%"), "Protect");
    }

    #[test]
    fn split_label_extracts_nature() {
        let (label, nature) = split_label_nature("252 HP / 4 Atk Adamant 28.4%");
        assert_eq!(nature.as_deref(), Some("Adamant"));
        assert!(label.contains("252 HP"));
    }

    #[test]
    fn build_url_adds_lang_suffix() {
        assert!(build_url("incineroar", "en").ends_with("/incineroar"));
        assert!(build_url("incineroar", "es").ends_with("?l=es"));
    }
}
