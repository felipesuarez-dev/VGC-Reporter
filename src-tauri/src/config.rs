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
pub const PIKALYTICS_BASE: &str = "https://www.pikalytics.com";
pub const POKEAPI_CSV_BASE: &str =
    "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv";

// Labmaus: primary source for top teams + meta snapshot. The public JSON API
// at labmaus.net/api/* gates every request on Origin/Referer matching the
// site itself — without them every response is 401. Our HttpClient injects
// both via get_cached_with_headers so they never leak to other hosts.
pub const LABMAUS_BASE: &str = "https://labmaus.net";
pub const LABMAUS_ORIGIN: &str = "https://labmaus.net";
pub const LABMAUS_REFERER: &str = "https://labmaus.net/";
pub const POKEPASTE_BASE: &str = "https://pokepast.es";
pub const REGULATION_MA_LABMAUS: &str = "Regulation Set M-A";

pub const POKEAPI_ABILITY_FLAVOR_CSV: &str = "ability_flavor_text.csv";
pub const POKEAPI_MOVE_FLAVOR_CSV: &str = "move_flavor_text.csv";
pub const POKEAPI_ITEM_FLAVOR_CSV: &str = "item_flavor_text.csv";

// Cache TTLs (seconds)
pub const TTL_LIMITLESS_LIST: i64 = 60 * 60; // 1h
pub const TTL_LIMITLESS_DETAIL: i64 = 24 * 60 * 60; // 24h
pub const TTL_SHOWDOWN_DATA: i64 = 7 * 24 * 60 * 60; // 7d
pub const TTL_SMOGON_STATS: i64 = 24 * 60 * 60; // 24h
pub const TTL_META_SNAPSHOT: i64 = 6 * 60 * 60; // 6h aggregated
pub const TTL_POKEAPI_CSV: i64 = 30 * 24 * 60 * 60; // 30d
pub const TTL_PIKALYTICS: i64 = 24 * 60 * 60; // 24h
pub const TTL_LABMAUS_TOURNAMENTS: i64 = 24 * 60 * 60; // 24h
pub const TTL_LABMAUS_TOP_TEAMS: i64 = 2 * 60 * 60; // 2h
pub const TTL_LABMAUS_TRENDING: i64 = 4 * 60 * 60; // 4h
pub const TTL_LABMAUS_CATALOG: i64 = 24 * 60 * 60; // 24h (id→name map, rarely changes)
pub const TTL_POKEPASTE: i64 = 30 * 24 * 60 * 60; // 30d (pastes are immutable)

// Dataset sizing
pub const TOURNAMENTS_PER_SNAPSHOT: usize = 25;
pub const LABMAUS_WINDOW_DAYS: i64 = 14;
/// Half-window length for trending deltas (current 7d vs previous 7d).
pub const LABMAUS_TRENDING_WINDOW_DAYS: i64 = 7;

// Trending algorithm tunables. See services/trending_service.rs for the
// composite momentum score built from these. Values are intentionally soft —
// tune as the player base grows without touching service logic.

/// Bayesian shrinkage weight in pseudo-observations. Pulls low-sample usage
/// rates toward `TRENDING_PRIOR_RATE`. Higher `k` = more conservative ranking.
pub const TRENDING_BAYES_K: f32 = 8.0;
/// Prior usage rate (fraction of teams). Represents "a species we haven't
/// seen yet is expected to be used this often". 1% is a reasonable floor for
/// an open-dex competitive format.
pub const TRENDING_PRIOR_RATE: f32 = 0.01;
/// Log-ratio contribution to the final momentum score. Calibrated so a
/// 1%→2% mover (big relative change, small absolute) ranks comparably to a
/// 30%→31% mover (small relative, large absolute).
pub const TRENDING_BETA_LOG: f32 = 2.0;
/// Epsilon added to both sides of the log-ratio to keep it finite when a
/// species is absent from one window.
pub const TRENDING_EPSILON: f32 = 0.005;
/// If the current window has fewer weighted teams than this, fall back to a
/// window twice as long (2 × LABMAUS_TRENDING_WINDOW_DAYS) once.
pub const TRENDING_MIN_WINDOW_TEAMS: f32 = 20.0;
/// Adaptive minimum-sample floor: require at least this fraction of the
/// larger window total (weighted) before a species is eligible for ranking.
pub const TRENDING_SAMPLE_FRACTION: f32 = 0.01;
/// Absolute floor for the adaptive minimum sample size.
pub const TRENDING_MIN_SAMPLE_FLOOR: u32 = 3;
/// Placement ≤ this → top-cut weight tier.
pub const TRENDING_PLACEMENT_TOPCUT: u32 = 8;
/// Placement ≤ this (and > topcut) → day-2 weight tier.
pub const TRENDING_PLACEMENT_DAY2: u32 = 32;
pub const TRENDING_WEIGHT_TOPCUT: f32 = 3.0;
pub const TRENDING_WEIGHT_DAY2: f32 = 2.0;
pub const TRENDING_WEIGHT_DEFAULT: f32 = 1.0;
