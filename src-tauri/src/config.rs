//! Central constants: API base URLs, cache TTLs, HTTP timeouts.

pub const APP_USER_AGENT: &str = concat!(
    "VGC-Reporter/",
    env!("CARGO_PKG_VERSION"),
    " (PumaSoft; https://github.com/pumasoft/vgc-reporter)"
);

pub const HTTP_TIMEOUT_SECS: u64 = 30;

// Base URLs
pub const LIMITLESS_API: &str = "https://play.limitlesstcg.com/api";
pub const SHOWDOWN_DATA: &str = "https://play.pokemonshowdown.com/data";
pub const SHOWDOWN_SPRITES: &str = "https://play.pokemonshowdown.com/sprites/gen5";
pub const SMOGON_STATS: &str = "https://www.smogon.com/stats";
pub const PKMN_DATA: &str = "https://data.pkmn.cc";
pub const POKEAPI: &str = "https://pokeapi.co/api/v2";

// Cache TTLs (seconds)
pub const TTL_LIMITLESS_LIST: i64 = 60 * 60; // 1h
pub const TTL_LIMITLESS_DETAIL: i64 = 24 * 60 * 60; // 24h
pub const TTL_SHOWDOWN_DATA: i64 = 7 * 24 * 60 * 60; // 7d
pub const TTL_SMOGON_STATS: i64 = 24 * 60 * 60; // 24h
pub const TTL_META_SNAPSHOT: i64 = 6 * 60 * 60; // 6h aggregated

// Dataset sizing
pub const TOURNAMENTS_PER_SNAPSHOT: usize = 25;
