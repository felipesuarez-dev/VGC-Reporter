use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub enum PokemonType {
    Normal,
    Fire,
    Water,
    Electric,
    Grass,
    Ice,
    Fighting,
    Poison,
    Ground,
    Flying,
    Psychic,
    Bug,
    Rock,
    Ghost,
    Dragon,
    Dark,
    Steel,
    Fairy,
    Stellar,
}

impl PokemonType {
    pub fn parse(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "normal" => Some(Self::Normal),
            "fire" => Some(Self::Fire),
            "water" => Some(Self::Water),
            "electric" => Some(Self::Electric),
            "grass" => Some(Self::Grass),
            "ice" => Some(Self::Ice),
            "fighting" => Some(Self::Fighting),
            "poison" => Some(Self::Poison),
            "ground" => Some(Self::Ground),
            "flying" => Some(Self::Flying),
            "psychic" => Some(Self::Psychic),
            "bug" => Some(Self::Bug),
            "rock" => Some(Self::Rock),
            "ghost" => Some(Self::Ghost),
            "dragon" => Some(Self::Dragon),
            "dark" => Some(Self::Dark),
            "steel" => Some(Self::Steel),
            "fairy" => Some(Self::Fairy),
            "stellar" => Some(Self::Stellar),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct Stats {
    pub hp: u16,
    pub atk: u16,
    pub def: u16,
    pub spa: u16,
    pub spd: u16,
    pub spe: u16,
}

impl Stats {
    pub fn total(&self) -> u32 {
        self.hp as u32
            + self.atk as u32
            + self.def as u32
            + self.spa as u32
            + self.spd as u32
            + self.spe as u32
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct Pokemon {
    /// Showdown canonical id (e.g. "incineroar").
    pub id: String,
    /// Display name (e.g. "Incineroar").
    pub name: String,
    /// National Pokédex number. 0 for entries that have no number (cosmetic forms).
    #[serde(default)]
    pub num: u16,
    pub types: Vec<PokemonType>,
    pub base_stats: Stats,
    pub abilities: Vec<String>,
    pub sprite_url: String,
    /// Secondary sprite URL tried by the frontend when `sprite_url` 404s.
    /// Variant-aware: indexed by slug, not dex number.
    #[serde(default)]
    pub sprite_fallback_url: Option<String>,
}

/// Returns the Pokémon generation that the given national dex number belongs to.
/// 0 = unknown / cosmetic form.
pub fn generation_of(num: u16) -> u8 {
    match num {
        1..=151 => 1,
        152..=251 => 2,
        252..=386 => 3,
        387..=493 => 4,
        494..=649 => 5,
        650..=721 => 6,
        722..=809 => 7,
        810..=905 => 8,
        906..=1025 => 9,
        _ => 0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generation_boundaries() {
        assert_eq!(generation_of(1), 1);
        assert_eq!(generation_of(151), 1);
        assert_eq!(generation_of(152), 2);
        assert_eq!(generation_of(386), 3);
        assert_eq!(generation_of(722), 7);
        assert_eq!(generation_of(906), 9);
        assert_eq!(generation_of(1025), 9);
        assert_eq!(generation_of(0), 0);
        assert_eq!(generation_of(9999), 0);
    }
}
