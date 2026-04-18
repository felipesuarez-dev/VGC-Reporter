use crate::adapters::sprite_resolver::{canonical_display_name, canonical_id, primary_sprite_url};
use crate::adapters::HttpClient;
use crate::config;
use crate::domain::pikalytics::{
    PikalyticsEntry, PikalyticsEvSpread, PikalyticsItem, PikalyticsTeammate,
};
use crate::error::AppError;
use scraper::{ElementRef, Html, Selector};
use std::sync::OnceLock;

/// Pikalytics does not publish an API. We scrape the official Champions
/// Tournaments page (VGC 2026), which is the authoritative source for the
/// current format's aggregated data. The parser degrades gracefully: any
/// missing section returns empty, it never panics on selector misses.
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
    // Pikalytics expects ISO 639-3 (`spa`) on the query string, not `es`.
    let lang_suffix = match lang {
        "es" => "?l=spa",
        _ => "",
    };
    format!(
        "{}/pokedex/championstournaments/{}{}",
        config::PIKALYTICS_BASE,
        species_id,
        lang_suffix
    )
}

// ---------- cached selectors (never-failing literals) ----------

macro_rules! cached_selector {
    ($name:ident, $query:expr) => {
        fn $name() -> &'static Selector {
            static S: OnceLock<Selector> = OnceLock::new();
            S.get_or_init(|| Selector::parse($query).expect("valid selector literal"))
        }
    };
}

cached_selector!(sel_row, ".pokedex-move-entry-new");
cached_selector!(sel_usage, ".pokedex-inline-right");
cached_selector!(sel_inline_text, ".pokedex-inline-text");
cached_selector!(sel_inline_text_offset, ".pokedex-inline-text-offset");
cached_selector!(sel_teammate_entry, "a.teammate_entry");
cached_selector!(sel_items_container, "#items_wrapper");
cached_selector!(sel_moves_container, "#moves_wrapper");
cached_selector!(sel_abilities_container, "#abilities_wrapper");
cached_selector!(sel_teammates_container, "#dex_team_wrapper");
cached_selector!(sel_spreads_container, "#dex_spreads_wrapper");
cached_selector!(
    sel_header_usage,
    ".usage-container .usage, .pokemon-usage, .stat-value"
);

enum RowKind {
    /// Row where the visible name sits in `.pokedex-inline-text` (items).
    Item,
    /// Row where the name sits in `.pokedex-inline-text-offset` (moves,
    /// abilities).
    Name,
}

fn parse_entry(html: &str, species_id: &str, species_display: &str, url: &str) -> PikalyticsEntry {
    let doc = Html::parse_document(html);

    PikalyticsEntry {
        species_id: species_id.to_string(),
        species_display: species_display.to_string(),
        sprite_url: Some(primary_sprite_url(species_display)),
        usage_percent: parse_header_usage(&doc),
        common_items: parse_rows(&doc, sel_items_container(), RowKind::Item),
        common_moves: parse_rows(&doc, sel_moves_container(), RowKind::Name),
        common_abilities: parse_rows(&doc, sel_abilities_container(), RowKind::Name),
        common_teammates: parse_teammates(&doc),
        common_tera: Vec::new(),
        ev_spreads: parse_spreads(&doc),
        source_url: url.to_string(),
    }
}

fn parse_header_usage(doc: &Html) -> Option<f32> {
    doc.select(sel_header_usage())
        .filter_map(|el| parse_percent(&el.text().collect::<String>()))
        .next()
}

fn parse_rows(doc: &Html, container_sel: &Selector, kind: RowKind) -> Vec<PikalyticsItem> {
    let Some(container) = doc.select(container_sel).next() else {
        return Vec::new();
    };
    let name_sel = match kind {
        RowKind::Item => sel_inline_text(),
        RowKind::Name => sel_inline_text_offset(),
    };

    container
        .select(sel_row())
        .filter_map(|row| {
            let name = row
                .select(name_sel)
                .next()
                .map(|el| el.text().collect::<String>().trim().to_string())?;
            if name.is_empty() || name.eq_ignore_ascii_case("Other") {
                return None;
            }
            let usage = row
                .select(sel_usage())
                .next()
                .and_then(|el| parse_percent(&el.text().collect::<String>()));
            Some(PikalyticsItem {
                name,
                usage_percent: usage,
            })
        })
        .take(10)
        .collect()
}

fn parse_teammates(doc: &Html) -> Vec<PikalyticsTeammate> {
    let Some(container) = doc.select(sel_teammates_container()).next() else {
        return Vec::new();
    };
    container
        .select(sel_teammate_entry())
        .filter_map(|row| {
            let species = row
                .value()
                .attr("data-name")
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())?;
            let usage = row
                .select(sel_usage())
                .next()
                .and_then(|el| parse_percent(&el.text().collect::<String>()));
            Some(PikalyticsTeammate {
                species,
                usage_percent: usage,
                sprite_url: None,
            })
        })
        .take(10)
        .collect()
}

fn parse_spreads(doc: &Html) -> Vec<PikalyticsEvSpread> {
    let Some(container) = doc.select(sel_spreads_container()).next() else {
        return Vec::new();
    };
    container
        .select(sel_row())
        .filter_map(|row| {
            let nature = row
                .select(sel_inline_text_offset())
                .next()
                .map(|el| el.text().collect::<String>().trim().to_string())
                .filter(|s| !s.is_empty());
            let evs: Vec<String> = row
                .select(sel_inline_text())
                .map(|el| {
                    el.text()
                        .collect::<String>()
                        .trim()
                        .trim_end_matches('/')
                        .trim()
                        .to_string()
                })
                .filter(|s| !s.is_empty())
                .collect();
            if evs.is_empty() {
                return None;
            }
            let usage = row
                .select(sel_usage())
                .next()
                .and_then(|el| parse_percent(&el.text().collect::<String>()));
            Some(PikalyticsEvSpread {
                label: evs.join(" / "),
                usage_percent: usage,
                nature,
            })
        })
        .take(10)
        .collect()
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

// Keeps the warn-unused-on-future-expansion contract explicit.
#[allow(dead_code)]
fn element_text(el: ElementRef<'_>) -> String {
    el.text().collect::<String>().trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_percent_recovers_from_trailing_symbol() {
        assert!((parse_percent("Choice Scarf 44.2%").unwrap() - 44.2).abs() < 0.01);
    }

    #[test]
    fn build_url_uses_champions_tournaments_and_spa_lang() {
        assert!(build_url("incineroar", "en").ends_with("/championstournaments/incineroar"));
        assert!(build_url("incineroar", "es").ends_with("/championstournaments/incineroar?l=spa"));
    }

    #[test]
    fn parses_items_moves_abilities_teammates_spreads_from_real_html() {
        const SAMPLE: &str = include_str!("pikalytics_sample.html");
        let entry = parse_entry(
            SAMPLE,
            "incineroar",
            "Incineroar",
            "https://www.pikalytics.com/pokedex/championstournaments/incineroar",
        );

        assert!(!entry.common_items.is_empty(), "items should parse");
        assert!(
            entry.common_items.iter().any(|i| i.usage_percent.is_some()),
            "at least one item should have a usage %"
        );
        assert!(
            entry
                .common_moves
                .iter()
                .any(|m| m.name.eq_ignore_ascii_case("Fake Out")),
            "Fake Out should be among top moves"
        );
        assert!(!entry.common_abilities.is_empty(), "abilities should parse");
        assert!(
            entry.common_teammates.iter().any(|t| !t.species.is_empty()),
            "at least one teammate with data-name"
        );
        assert!(
            entry
                .ev_spreads
                .iter()
                .any(|s| s.nature.is_some() && !s.label.is_empty()),
            "spread with nature and evs"
        );
    }

    #[test]
    fn other_row_is_skipped() {
        // Defensive: Pikalytics occasionally renders an "Other" bucket that
        // aggregates the long tail. We don't want to surface it as a concrete
        // pick.
        const SAMPLE: &str = r#"
            <div id="items_wrapper">
              <div class="pokedex-move-entry-new">
                <span class="pokedex-inline-text">Safety Goggles</span>
                <span class="pokedex-inline-right">53.2%</span>
              </div>
              <div class="pokedex-move-entry-new">
                <span class="pokedex-inline-text">Other</span>
                <span class="pokedex-inline-right">12.1%</span>
              </div>
            </div>
        "#;
        let doc = Html::parse_document(SAMPLE);
        let rows = parse_rows(&doc, sel_items_container(), RowKind::Item);
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].name, "Safety Goggles");
    }
}
