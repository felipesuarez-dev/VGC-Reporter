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
}
