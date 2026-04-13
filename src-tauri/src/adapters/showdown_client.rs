use crate::adapters::sprite_resolver::{fallback_sprite_url, primary_sprite_url};
use crate::adapters::HttpClient;
use crate::config;
use crate::domain::pokemon::{Pokemon, PokemonType, Stats};
use crate::error::AppError;
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

    /// Fetches Showdown's pokedex.json (raw JS-like object already converted to JSON).
    pub async fn fetch_pokedex(&self) -> Result<ShowdownPokedex, AppError> {
        // Note: Showdown distributes pokedex as pokedex.json (plain JSON).
        let url = format!("{}/pokedex.json", config::SHOWDOWN_DATA);
        let raw: HashMap<String, RawEntry> =
            self.http.get_json(&url, config::TTL_SHOWDOWN_DATA).await?;
        let mut pokemon = Vec::with_capacity(raw.len());
        for (id, entry) in raw.into_iter() {
            if entry.num <= 0 {
                continue;
            }
            let types = entry
                .types
                .iter()
                .filter_map(|t| PokemonType::from_str(t))
                .collect();
            let abilities = entry
                .abilities
                .values()
                .cloned()
                .collect::<Vec<_>>();
            let display = entry.name.clone().unwrap_or_else(|| id.clone());
            let sprite_url = primary_sprite_url(&display);
            let sprite_fallback_url = fallback_sprite_url(&display);
            pokemon.push(Pokemon {
                id: id.clone(),
                name: display,
                num: entry.num.max(0) as u16,
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
