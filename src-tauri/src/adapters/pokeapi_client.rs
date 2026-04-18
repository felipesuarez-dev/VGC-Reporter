use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::adapters::HttpClient;
use crate::config;
use crate::error::AppError;

const LANG_ES: u32 = 7;
const LANG_EN: u32 = 9;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct LocalizedName {
    pub en: String,
    pub es: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct LocalizedDescription {
    pub en: String,
    pub es: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct TranslationTable {
    pub abilities: HashMap<String, LocalizedName>,
    pub moves: HashMap<String, LocalizedName>,
    pub items: HashMap<String, LocalizedName>,
}

#[derive(Clone)]
pub struct PokeApiClient {
    http: HttpClient,
}

impl PokeApiClient {
    pub fn new(http: HttpClient) -> Self {
        Self { http }
    }

    pub async fn fetch_translation_table(&self) -> Result<TranslationTable, AppError> {
        let (abilities, moves, items) = tokio::try_join!(
            self.fetch_csv("ability_names.csv"),
            self.fetch_csv("move_names.csv"),
            self.fetch_csv("item_names.csv"),
        )?;
        Ok(TranslationTable {
            abilities,
            moves,
            items,
        })
    }

    async fn fetch_csv(&self, file: &str) -> Result<HashMap<String, LocalizedName>, AppError> {
        let url = format!("{}/{}", config::POKEAPI_CSV_BASE, file);
        let bytes = self.http.get_cached(&url, config::TTL_POKEAPI_CSV).await?;
        let text = String::from_utf8(bytes)
            .map_err(|e| AppError::Internal(format!("pokeapi csv utf8 error: {}", e)))?;
        Ok(parse_names_csv(&text))
    }

    /// Fetches ability/move/item localized descriptions keyed by normalized
    /// display name (lowercase alphanumeric). Joins the flavor-text CSV with
    /// the names CSV of the same entity so the resulting map is addressable
    /// the same way `TranslationTable` is.
    pub async fn fetch_ability_descriptions(
        &self,
    ) -> Result<HashMap<String, LocalizedDescription>, AppError> {
        self.fetch_descriptions(
            config::POKEAPI_ABILITY_FLAVOR_CSV,
            "ability_names.csv",
            "ability_id",
        )
        .await
    }

    pub async fn fetch_move_descriptions(
        &self,
    ) -> Result<HashMap<String, LocalizedDescription>, AppError> {
        self.fetch_descriptions(config::POKEAPI_MOVE_FLAVOR_CSV, "move_names.csv", "move_id")
            .await
    }

    pub async fn fetch_item_descriptions(
        &self,
    ) -> Result<HashMap<String, LocalizedDescription>, AppError> {
        self.fetch_descriptions(config::POKEAPI_ITEM_FLAVOR_CSV, "item_names.csv", "item_id")
            .await
    }

    async fn fetch_descriptions(
        &self,
        flavor_file: &str,
        names_file: &str,
        id_col: &str,
    ) -> Result<HashMap<String, LocalizedDescription>, AppError> {
        let flavor_url = format!("{}/{}", config::POKEAPI_CSV_BASE, flavor_file);
        let names_url = format!("{}/{}", config::POKEAPI_CSV_BASE, names_file);

        let (flavor_bytes, names_bytes) = tokio::try_join!(
            self.http.get_cached(&flavor_url, config::TTL_POKEAPI_CSV),
            self.http.get_cached(&names_url, config::TTL_POKEAPI_CSV),
        )?;

        let flavor_by_id = parse_flavor_csv(&flavor_bytes, id_col)?;
        let names_by_id = parse_names_by_id(&names_bytes);

        let mut out: HashMap<String, LocalizedDescription> =
            HashMap::with_capacity(names_by_id.len());
        for (id, en_name) in names_by_id {
            let key = normalize_key(&en_name);
            if key.is_empty() {
                continue;
            }
            let Some(flavor) = flavor_by_id.get(&id) else {
                continue;
            };
            let en = flavor.en.clone();
            let es = if flavor.es.is_empty() {
                en.clone()
            } else {
                flavor.es.clone()
            };
            if en.is_empty() && es.is_empty() {
                continue;
            }
            out.insert(key, LocalizedDescription { en, es });
        }
        Ok(out)
    }
}

fn parse_names_csv(text: &str) -> HashMap<String, LocalizedName> {
    let mut by_id: HashMap<u32, (Option<String>, Option<String>)> = HashMap::new();
    let mut lines = text.lines();
    lines.next();
    for raw in lines {
        let Some((id_str, rest)) = raw.split_once(',') else {
            continue;
        };
        let Some((lang_str, name)) = rest.split_once(',') else {
            continue;
        };
        let Ok(id) = id_str.parse::<u32>() else {
            continue;
        };
        let Ok(lang) = lang_str.parse::<u32>() else {
            continue;
        };
        if lang != LANG_ES && lang != LANG_EN {
            continue;
        }
        let entry = by_id.entry(id).or_insert((None, None));
        if lang == LANG_EN {
            entry.0 = Some(name.to_string());
        } else {
            entry.1 = Some(name.to_string());
        }
    }
    let mut out: HashMap<String, LocalizedName> = HashMap::with_capacity(by_id.len());
    for (_, (en, es)) in by_id {
        let Some(en) = en else { continue };
        let key = normalize_key(&en);
        if key.is_empty() {
            continue;
        }
        out.insert(
            key,
            LocalizedName {
                en: en.clone(),
                es: es.unwrap_or(en),
            },
        );
    }
    out
}

/// Parses a PokéAPI names CSV keyed by numeric id, returning only the English
/// name per id. Used as the bridge from flavor rows (which only carry ids) to
/// the normalized display-name keys used across the app.
fn parse_names_by_id(bytes: &[u8]) -> HashMap<u32, String> {
    let mut out: HashMap<u32, String> = HashMap::new();
    let Ok(text) = std::str::from_utf8(bytes) else {
        return out;
    };
    let mut lines = text.lines();
    lines.next();
    for raw in lines {
        let Some((id_str, rest)) = raw.split_once(',') else {
            continue;
        };
        let Some((lang_str, name)) = rest.split_once(',') else {
            continue;
        };
        let Ok(id) = id_str.parse::<u32>() else {
            continue;
        };
        let Ok(lang) = lang_str.parse::<u32>() else {
            continue;
        };
        if lang != LANG_EN {
            continue;
        }
        out.insert(id, name.to_string());
    }
    out
}

/// Parses PokéAPI flavor_text CSVs. Uses the `csv` crate because flavor text
/// contains embedded commas, escaped quotes and form-feed (`\f`) line
/// separators that the manual line/split parser used for name CSVs breaks on.
/// Aggregates by (entity_id, language) picking the row with the highest
/// `version_group_id` as the "most recent" flavor, then strips form-feeds and
/// collapses whitespace so tooltips render cleanly.
fn parse_flavor_csv(
    bytes: &[u8],
    id_col: &str,
) -> Result<HashMap<u32, LocalizedDescription>, AppError> {
    let mut rdr = csv::ReaderBuilder::new()
        .has_headers(true)
        .from_reader(bytes);

    let headers = rdr
        .headers()
        .map_err(|e| AppError::Internal(format!("pokeapi flavor csv headers: {}", e)))?
        .clone();
    let id_idx = headers
        .iter()
        .position(|h| h == id_col)
        .ok_or_else(|| AppError::Internal(format!("flavor csv missing column '{}'", id_col)))?;
    let vg_idx = headers
        .iter()
        .position(|h| h == "version_group_id")
        .ok_or_else(|| AppError::Internal("flavor csv missing column 'version_group_id'".into()))?;
    let lang_idx = headers
        .iter()
        .position(|h| h == "language_id")
        .ok_or_else(|| AppError::Internal("flavor csv missing column 'language_id'".into()))?;
    let text_idx = headers
        .iter()
        .position(|h| h == "flavor_text")
        .ok_or_else(|| AppError::Internal("flavor csv missing column 'flavor_text'".into()))?;

    // (entity_id, lang) → (best_vg_seen, text)
    let mut by_key: HashMap<(u32, u32), (u32, String)> = HashMap::new();
    for rec in rdr.records().flatten() {
        let Some(id) = rec.get(id_idx).and_then(|s| s.parse::<u32>().ok()) else {
            continue;
        };
        let Some(vg) = rec.get(vg_idx).and_then(|s| s.parse::<u32>().ok()) else {
            continue;
        };
        let Some(lang) = rec.get(lang_idx).and_then(|s| s.parse::<u32>().ok()) else {
            continue;
        };
        if lang != LANG_ES && lang != LANG_EN {
            continue;
        }
        let Some(text) = rec.get(text_idx) else {
            continue;
        };
        let cleaned = clean_flavor_text(text);
        if cleaned.is_empty() {
            continue;
        }
        by_key
            .entry((id, lang))
            .and_modify(|slot| {
                if vg > slot.0 {
                    *slot = (vg, cleaned.clone());
                }
            })
            .or_insert((vg, cleaned));
    }

    let mut out: HashMap<u32, LocalizedDescription> = HashMap::new();
    for ((id, lang), (_vg, text)) in by_key {
        let entry = out.entry(id).or_insert_with(|| LocalizedDescription {
            en: String::new(),
            es: String::new(),
        });
        if lang == LANG_EN {
            entry.en = text;
        } else {
            entry.es = text;
        }
    }
    Ok(out)
}

fn clean_flavor_text(raw: &str) -> String {
    raw.replace('\u{000C}', " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

pub fn normalize_key(s: &str) -> String {
    s.chars()
        .filter_map(|c| {
            if c.is_ascii_alphanumeric() {
                Some(c.to_ascii_lowercase())
            } else {
                None
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_key_strips_non_alphanumeric() {
        assert_eq!(normalize_key("Flutter Mane"), "fluttermane");
        assert_eq!(normalize_key("Iron-Hands"), "ironhands");
        assert_eq!(normalize_key("Farfetch'd"), "farfetchd");
        assert_eq!(normalize_key("Focus Sash"), "focussash");
    }

    #[test]
    fn parse_names_csv_picks_spanish_and_english() {
        let csv = "move_id,local_language_id,name\n\
            1,1,はたく\n\
            1,7,Destructor\n\
            1,9,Pound\n\
            2,7,Golpe Kárate\n\
            2,9,Karate Chop\n";
        let table = parse_names_csv(csv);
        let pound = table.get("pound").expect("pound missing");
        assert_eq!(pound.en, "Pound");
        assert_eq!(pound.es, "Destructor");
        let karate = table.get("karatechop").expect("karate chop missing");
        assert_eq!(karate.en, "Karate Chop");
        assert_eq!(karate.es, "Golpe Kárate");
    }

    #[test]
    fn parse_names_csv_falls_back_when_spanish_missing() {
        let csv = "id,lang,name\n1,9,Only English\n";
        let table = parse_names_csv(csv);
        let entry = table.get("onlyenglish").expect("entry missing");
        assert_eq!(entry.en, "Only English");
        assert_eq!(entry.es, "Only English");
    }

    #[test]
    fn parse_flavor_csv_picks_latest_version_group_and_cleans_formfeed() {
        let csv = "move_id,version_group_id,language_id,flavor_text\n\
            1,1,9,Old english text.\n\
            1,20,9,\"Newer english\u{000C}text.\"\n\
            1,20,7,\"Texto\u{000C}español.\"\n\
            2,1,9,Only old english.\n";
        let map = parse_flavor_csv(csv.as_bytes(), "move_id").expect("parse ok");

        let m1 = map.get(&1).expect("id 1 missing");
        assert_eq!(m1.en, "Newer english text.");
        assert_eq!(m1.es, "Texto español.");

        let m2 = map.get(&2).expect("id 2 missing");
        assert_eq!(m2.en, "Only old english.");
        assert_eq!(m2.es, "");
    }

    #[test]
    fn parse_flavor_csv_handles_embedded_commas_and_quotes() {
        let csv = "item_id,version_group_id,language_id,flavor_text\n\
            1,10,9,\"Holder's Speed is 1.5x; can't switch moves.\"\n\
            2,10,9,\"Raises Atk, SpA of the user.\"\n";
        let map = parse_flavor_csv(csv.as_bytes(), "item_id").expect("parse ok");
        assert_eq!(
            map.get(&1).map(|d| d.en.as_str()),
            Some("Holder's Speed is 1.5x; can't switch moves.")
        );
        assert_eq!(
            map.get(&2).map(|d| d.en.as_str()),
            Some("Raises Atk, SpA of the user.")
        );
    }

    #[test]
    fn clean_flavor_text_strips_control_chars_and_collapses_whitespace() {
        assert_eq!(clean_flavor_text("hello\u{000C}world"), "hello world");
        assert_eq!(clean_flavor_text("  a\n\n b \t c  "), "a b c");
    }
}
