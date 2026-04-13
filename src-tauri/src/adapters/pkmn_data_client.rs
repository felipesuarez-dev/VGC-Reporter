use crate::adapters::HttpClient;
use crate::config;
use crate::domain::evs::EvSpread;
use crate::domain::sets::PokemonSet;
use crate::error::AppError;
use serde::Deserialize;
use std::collections::BTreeMap;

/// Client for `data.pkmn.cc` curated competitive sets.
/// Format slugs follow Smogon naming: e.g. `gen9vgc2025`, `gen9vgc2024regg`.
#[derive(Clone)]
pub struct PkmnDataClient {
    http: HttpClient,
}

impl PkmnDataClient {
    pub fn new(http: HttpClient) -> Self {
        Self { http }
    }

    /// Fetches the entire sets file for a format slug. Returns `None` on 404 so
    /// callers can walk a fallback chain.
    pub async fn fetch_sets(&self, slug: &str) -> Result<Option<PkmnSetsFile>, AppError> {
        let url = format!("{}/sets/{}.json", config::PKMN_DATA, slug);
        match self
            .http
            .get_json::<PkmnSetsFile>(&url, config::TTL_SHOWDOWN_DATA)
            .await
        {
            Ok(file) => Ok(Some(file)),
            Err(AppError::Http(_)) => Ok(None),
            Err(e) => Err(e),
        }
    }
}

/// Top-level shape: `{ "Charizard": { "Sun Sweeper": { ... } } }`.
pub type PkmnSetsFile = BTreeMap<String, BTreeMap<String, RawSet>>;

#[derive(Debug, Clone, Deserialize)]
pub struct RawSet {
    #[serde(default)]
    pub item: Option<String>,
    #[serde(default)]
    pub ability: Option<String>,
    #[serde(default)]
    pub nature: Option<String>,
    /// `teratypes` may be a single string or an array of strings.
    #[serde(default)]
    pub teratypes: Option<TeraTypes>,
    #[serde(default)]
    pub evs: RawEvs,
    #[serde(default)]
    pub moves: Vec<MoveSlot>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum TeraTypes {
    One(String),
    Many(Vec<String>),
}

impl TeraTypes {
    pub fn into_vec(self) -> Vec<String> {
        match self {
            TeraTypes::One(s) => vec![s],
            TeraTypes::Many(v) => v,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum MoveSlot {
    One(String),
    Many(Vec<String>),
}

impl MoveSlot {
    pub fn flatten(self) -> String {
        match self {
            MoveSlot::One(s) => s,
            MoveSlot::Many(v) => v.join(" / "),
        }
    }
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct RawEvs {
    #[serde(default)]
    pub hp: u16,
    #[serde(default)]
    pub atk: u16,
    #[serde(default)]
    pub def: u16,
    #[serde(default)]
    pub spa: u16,
    #[serde(default)]
    pub spd: u16,
    #[serde(default)]
    pub spe: u16,
}

impl From<RawEvs> for EvSpread {
    fn from(r: RawEvs) -> Self {
        EvSpread {
            hp: r.hp,
            atk: r.atk,
            def: r.def,
            spa: r.spa,
            spd: r.spd,
            spe: r.spe,
        }
    }
}

/// Convert a `RawSet` (with its set name) into the public domain shape.
pub fn into_pokemon_set(name: String, raw: RawSet) -> PokemonSet {
    PokemonSet {
        name,
        item: raw.item,
        ability: raw.ability,
        nature: raw.nature,
        tera_types: raw.teratypes.map(|t| t.into_vec()).unwrap_or_default(),
        evs: raw.evs.into(),
        moves: raw.moves.into_iter().map(MoveSlot::flatten).collect(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const FIXTURE: &str = r#"{
        "Charizard": {
            "Sun Sweeper": {
                "moves": ["Heat Wave", "Weather Ball", "Overheat", ["Air Slash", "Dragon Pulse"]],
                "ability": "Solar Power",
                "item": "Choice Specs",
                "nature": "Timid",
                "ivs": { "atk": 0 },
                "evs": { "hp": 4, "spa": 252, "spe": 252 },
                "teratypes": "Ghost"
            }
        },
        "Iron Hands": {
            "Bulky Booster": {
                "moves": ["Fake Out", "Drain Punch", "Wild Charge", "Heavy Slam"],
                "ability": "Quark Drive",
                "item": "Booster Energy",
                "nature": "Adamant",
                "evs": { "hp": 252, "atk": 124, "def": 4, "spd": 124, "spe": 4 },
                "teratypes": ["Water", "Grass"]
            }
        }
    }"#;

    #[test]
    fn parses_fixture_with_mixed_move_slots() {
        let file: PkmnSetsFile = serde_json::from_str(FIXTURE).unwrap();
        let charizard = file.get("Charizard").unwrap();
        let raw = charizard.get("Sun Sweeper").unwrap().clone();
        let set = into_pokemon_set("Sun Sweeper".into(), raw);
        assert_eq!(set.item.as_deref(), Some("Choice Specs"));
        assert_eq!(set.ability.as_deref(), Some("Solar Power"));
        assert_eq!(set.moves.len(), 4);
        assert_eq!(set.moves[3], "Air Slash / Dragon Pulse");
        assert_eq!(set.tera_types, vec!["Ghost"]);
        assert_eq!(set.evs.spa, 252);
    }

    #[test]
    fn parses_fixture_with_array_teratypes() {
        let file: PkmnSetsFile = serde_json::from_str(FIXTURE).unwrap();
        let raw = file
            .get("Iron Hands")
            .unwrap()
            .get("Bulky Booster")
            .unwrap()
            .clone();
        let set = into_pokemon_set("Bulky Booster".into(), raw);
        assert_eq!(set.tera_types, vec!["Water", "Grass"]);
        assert_eq!(set.evs.hp, 252);
    }
}
