use crate::adapters::sprite_resolver::{
    fallback_sprite_url_parts, primary_sprite_url_parts,
};
use crate::adapters::HttpClient;
use crate::config;
use crate::domain::move_::{MoveCategory, MoveSummary};
use crate::domain::pokemon::{Pokemon, PokemonType, Stats};
use crate::error::AppError;
use regex::Regex;
use serde::Deserialize;
use std::collections::HashMap;

#[derive(Clone)]
pub struct ShowdownClient {
    http: HttpClient,
}

impl ShowdownClient {
    pub fn new(http: HttpClient) -> Self {
        Self { http }
    }

    /// Fetches Showdown's pokedex.json. Cosmetic formes (`num == null`)
    /// inherit their dex number from the base species so they survive the
    /// downstream filters, and sprite URLs honour Showdown's
    /// `{baseId}-{formeId}` CDN layout.
    pub async fn fetch_pokedex(&self) -> Result<ShowdownPokedex, AppError> {
        let url = format!("{}/pokedex.json", config::SHOWDOWN_DATA);
        let raw: HashMap<String, RawEntry> =
            self.http.get_json(&url, config::TTL_SHOWDOWN_DATA).await?;

        // Resolve num for cosmetic formes by walking up the baseSpecies chain.
        let num_lookup: HashMap<String, i64> = raw
            .iter()
            .filter(|(_, e)| e.num > 0)
            .map(|(k, e)| (k.clone(), e.num))
            .collect();

        let mut pokemon = Vec::with_capacity(raw.len());
        for (id, entry) in raw.iter() {
            let resolved_num = if entry.num > 0 {
                entry.num
            } else if let Some(base) = entry.base_species.as_ref() {
                let base_id: String = base
                    .chars()
                    .filter(|c| c.is_ascii_alphanumeric())
                    .map(|c| c.to_ascii_lowercase())
                    .collect();
                *num_lookup.get(&base_id).unwrap_or(&0)
            } else {
                0
            };
            if resolved_num <= 0 {
                continue;
            }

            let display = entry.name.clone().unwrap_or_else(|| id.clone());
            let base = entry.base_species.as_deref().unwrap_or(&display);
            let forme = entry.forme.as_deref();
            let sprite_url = primary_sprite_url_parts(base, forme);
            let sprite_fallback_url = fallback_sprite_url_parts(base, forme);

            let types = entry
                .types
                .iter()
                .filter_map(|t| PokemonType::parse(t))
                .collect();
            let abilities = entry.abilities.values().cloned().collect::<Vec<_>>();

            pokemon.push(Pokemon {
                id: id.clone(),
                name: display,
                num: resolved_num.max(0) as u16,
                types,
                base_stats: Stats {
                    hp: entry.base_stats.hp,
                    atk: entry.base_stats.atk,
                    def: entry.base_stats.def,
                    spa: entry.base_stats.spa,
                    spd: entry.base_stats.spd,
                    spe: entry.base_stats.spe,
                },
                abilities,
                sprite_url,
                sprite_fallback_url,
            });
        }
        pokemon.sort_by(|a, b| a.name.cmp(&b.name));
        Ok(ShowdownPokedex { pokemon })
    }

    /// Returns the deduplicated, alphabetised list of every item display name
    /// known to Showdown (~600 entries). Showdown no longer ships `items.json`
    /// so the list is parsed out of `items.js`, which exports a JavaScript
    /// object literal (`exports.BattleItems = {id:{name:"…"…},…};`).
    pub async fn fetch_items(&self) -> Result<Vec<String>, AppError> {
        let url = format!("{}/items.js", config::SHOWDOWN_DATA);
        let bytes = self.http.get_cached(&url, config::TTL_SHOWDOWN_DATA).await?;
        let body = String::from_utf8_lossy(&bytes);
        let names = extract_js_names(&body);
        if names.is_empty() {
            return Err(AppError::Internal(
                "failed to parse items.js from Showdown".into(),
            ));
        }
        Ok(names)
    }

    /// Returns the deduplicated, alphabetised list of every move display name
    /// known to Showdown (~1k entries). `moves.json` still exists so we keep
    /// the JSON path.
    pub async fn fetch_moves(&self) -> Result<Vec<String>, AppError> {
        let url = format!("{}/moves.json", config::SHOWDOWN_DATA);
        let raw: HashMap<String, RawNamed> =
            self.http.get_json(&url, config::TTL_SHOWDOWN_DATA).await?;
        let mut names: Vec<String> = raw
            .into_iter()
            .filter_map(|(_, e)| e.name.filter(|n| !n.is_empty()))
            .collect();
        names.sort();
        names.dedup();
        Ok(names)
    }

    /// Fetches every move with its type and category keyed by move id.
    pub async fn fetch_move_details(&self) -> Result<HashMap<String, MoveSummary>, AppError> {
        let url = format!("{}/moves.json", config::SHOWDOWN_DATA);
        let raw: HashMap<String, RawMoveEntry> =
            self.http.get_json(&url, config::TTL_SHOWDOWN_DATA).await?;
        let mut out = HashMap::with_capacity(raw.len());
        for (id, entry) in raw {
            let Some(name) = entry.name else { continue };
            if name.is_empty() {
                continue;
            }
            let Some(ty) = entry.type_.as_deref().and_then(PokemonType::parse) else {
                continue;
            };
            let category = match entry.category.as_deref() {
                Some("Physical") => MoveCategory::Physical,
                Some("Special") => MoveCategory::Special,
                _ => MoveCategory::Status,
            };
            out.insert(
                id.clone(),
                MoveSummary {
                    id,
                    name,
                    type_: ty,
                    category,
                },
            );
        }
        Ok(out)
    }

    /// Fetches Showdown's learnsets.json. The raw shape is
    /// `{ species_id: { learnset: { move_id: ["9L1", …] } } }`; we flatten
    /// to `species_id -> Vec<move_id>` without resolving pre-evolution chains
    /// (VGC competitive teams use fully evolved mons in practice).
    pub async fn fetch_learnsets(&self) -> Result<HashMap<String, Vec<String>>, AppError> {
        let url = format!("{}/learnsets.json", config::SHOWDOWN_DATA);
        let raw: HashMap<String, RawLearnsetEntry> =
            self.http.get_json(&url, config::TTL_SHOWDOWN_DATA).await?;
        let mut out = HashMap::with_capacity(raw.len());
        for (species, entry) in raw {
            let moves: Vec<String> = entry.learnset.into_keys().collect();
            out.insert(species, moves);
        }
        Ok(out)
    }
}

/// Extracts the ordered set of `name:"…"` literals out of a Showdown data
/// module body (items.js / abilities.js). The file is UTF-8 JavaScript and
/// each entry is `id:{name:"Display Name",…}`.
fn extract_js_names(body: &str) -> Vec<String> {
    static RE: once_cell::sync::Lazy<Regex> =
        once_cell::sync::Lazy::new(|| Regex::new(r#"name\s*:\s*"((?:[^"\\]|\\.)*)""#).unwrap());
    let mut names: Vec<String> = RE
        .captures_iter(body)
        .filter_map(|c| c.get(1).map(|m| m.as_str().to_string()))
        .map(|n| n.replace("\\\"", "\""))
        .filter(|n| !n.is_empty())
        .collect();
    names.sort();
    names.dedup();
    names
}

#[derive(Debug, Deserialize)]
struct RawNamed {
    #[serde(default)]
    name: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RawMoveEntry {
    #[serde(default)]
    name: Option<String>,
    #[serde(default, rename = "type")]
    type_: Option<String>,
    #[serde(default)]
    category: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
struct RawLearnsetEntry {
    #[serde(default)]
    learnset: HashMap<String, serde_json::Value>,
}

pub struct ShowdownPokedex {
    pub pokemon: Vec<Pokemon>,
}

#[derive(Debug, Deserialize)]
struct RawEntry {
    #[serde(default)]
    num: i64,
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    types: Vec<String>,
    #[serde(default, rename = "baseStats")]
    base_stats: RawStats,
    #[serde(default)]
    abilities: HashMap<String, String>,
    #[serde(default, rename = "baseSpecies")]
    base_species: Option<String>,
    #[serde(default)]
    forme: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
struct RawStats {
    #[serde(default)]
    hp: u16,
    #[serde(default)]
    atk: u16,
    #[serde(default)]
    def: u16,
    #[serde(default)]
    spa: u16,
    #[serde(default)]
    spd: u16,
    #[serde(default)]
    spe: u16,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_js_names_pulls_items_from_js_body() {
        let body = r#"exports.BattleItems = {
            abilityshield:{name:"Ability Shield",spritenum:746,num:1881,gen:9},
            abomasite:{name:"Abomasite",spritenum:575,num:674,gen:6},
            choicescarf:{name:"Choice Scarf",spritenum:75,num:287,gen:4}
        };"#;
        let names = extract_js_names(body);
        assert_eq!(names, vec!["Ability Shield", "Abomasite", "Choice Scarf"]);
    }

    #[test]
    fn extract_js_names_handles_escaped_quotes() {
        let body = r#"{a:{name:"Hero's Bar"},b:{name:"Plain"}}"#;
        let names = extract_js_names(body);
        assert!(names.contains(&"Hero's Bar".to_string()));
        assert!(names.contains(&"Plain".to_string()));
    }

    #[test]
    fn extract_js_names_returns_empty_on_404_html() {
        let html = "<!DOCTYPE html><title>Not Found</title>";
        assert!(extract_js_names(html).is_empty());
    }
}
