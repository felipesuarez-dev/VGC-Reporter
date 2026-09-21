use crate::adapters::HttpClient;
use crate::config;
use crate::error::AppError;
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::Arc;

/// Client for champteams.gg's public JSON endpoints.
///
/// Three things are worth knowing before touching this:
///
/// 1. **The `format` query parameter is ignored upstream.** Every value
///    returns the same payload, so the regulation the data describes must be
///    read out of the response (`data_range`, `formula`), never assumed from
///    the request. [`ChampteamsTierList::declared_regulation`] does that.
/// 2. **The site's robots.txt disallows `/api/`.** We are a desktop client
///    acting for a user rather than a crawler, but we behave accordingly: a
///    12-hour TTL means at most two requests per user per day, and the
///    User-Agent identifies the app so the operator can see who is calling.
/// 3. **Its item strings are user-generated and dirty** (`Golisopodite`,
///    `Baxcaliburite`, `life orb`, `No Item`). Anything derived from them has
///    to be validated against a canonical source before being trusted.
#[derive(Clone)]
pub struct ChampteamsClient {
    http: Arc<HttpClient>,
}

impl ChampteamsClient {
    pub fn new(http: Arc<HttpClient>) -> Self {
        Self { http }
    }

    fn headers() -> Vec<(&'static str, &'static str)> {
        vec![
            ("Accept", "application/json"),
            ("User-Agent", config::CHAMPTEAMS_USER_AGENT),
        ]
    }

    /// Species-level meta with usage, win rate and the site's own tier.
    pub async fn get_tier_list(&self) -> Result<ChampteamsTierList, AppError> {
        let url = format!("{}/api/tier-list", config::CHAMPTEAMS_BASE);
        let bytes = self
            .http
            .get_cached_with_headers(&url, &Self::headers(), config::TTL_CHAMPTEAMS)
            .await?;
        Ok(serde_json::from_slice(&bytes)?)
    }

    /// Highest-performing pairs, trios and full teams.
    pub async fn get_top_combos(&self) -> Result<ChampteamsCombos, AppError> {
        let url = format!("{}/api/top-combos", config::CHAMPTEAMS_BASE);
        let bytes = self
            .http
            .get_cached_with_headers(&url, &Self::headers(), config::TTL_CHAMPTEAMS)
            .await?;
        Ok(serde_json::from_slice(&bytes)?)
    }

    /// Curated competitive sets keyed by Showdown species id.
    pub async fn get_default_sets(&self) -> Result<HashMap<String, ChampteamsSet>, AppError> {
        let url = format!("{}/api/default-sets", config::CHAMPTEAMS_BASE);
        let bytes = self
            .http
            .get_cached_with_headers(&url, &Self::headers(), config::TTL_CHAMPTEAMS)
            .await?;
        Ok(serde_json::from_slice(&bytes)?)
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChampteamsTierList {
    #[serde(default)]
    pub tiers: Vec<ChampteamsTier>,
    #[serde(default)]
    pub snapshot_date: Option<String>,
    /// Prose describing how the score was built. Also the only place the
    /// payload names the regulation it covers.
    #[serde(default)]
    pub formula: Option<String>,
    #[serde(default)]
    pub data_range: Option<ChampteamsDataRange>,
}

impl ChampteamsTierList {
    /// The regulation this payload claims to describe, e.g. `"M-B"`.
    ///
    /// Parsed out of `formula`, which reads like "...from Limitless Champions
    /// M-B tournaments of 30 or more players...". Returning `None` when
    /// nothing matches is deliberate: an unknown provenance is treated as
    /// not-current, which down-weights the source rather than letting it
    /// silently pass as authoritative for whatever was requested.
    pub fn declared_regulation(&self) -> Option<String> {
        let formula = self.formula.as_deref()?;
        let bytes = formula.as_bytes();
        // Look for "M-" followed by a single uppercase letter, and require the
        // next character not to be another letter so "M-Bx" does not match.
        for i in 0..bytes.len().saturating_sub(2) {
            if bytes[i] == b'M' && bytes[i + 1] == b'-' {
                let letter = bytes[i + 2];
                if letter.is_ascii_uppercase() {
                    let tail_is_clean = bytes
                        .get(i + 3)
                        .map(|c| !c.is_ascii_alphanumeric())
                        .unwrap_or(true);
                    if tail_is_clean {
                        return Some(format!("M-{}", letter as char));
                    }
                }
            }
        }
        None
    }

    pub fn total_pokemon(&self) -> usize {
        self.tiers.iter().map(|t| t.pokemon.len()).sum()
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChampteamsDataRange {
    #[serde(default)]
    pub earliest: Option<String>,
    #[serde(default)]
    pub latest: Option<String>,
    #[serde(default)]
    pub tournament_count: u32,
    #[serde(default)]
    pub team_count: u32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChampteamsTier {
    pub tier: String,
    #[serde(default)]
    pub pokemon: Vec<ChampteamsPokemon>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChampteamsPokemon {
    pub name: String,
    #[serde(default)]
    pub meta_score: Option<f32>,
    /// Share of teams running this species, already a percentage.
    #[serde(default)]
    pub tournament_usage: Option<f32>,
    #[serde(default)]
    pub win_rate: Option<f32>,
    #[serde(default)]
    pub moves: Vec<ChampteamsNamedPercent>,
    #[serde(default)]
    pub items: Vec<ChampteamsNamedPercent>,
    #[serde(default)]
    pub usage_abilities: Vec<ChampteamsNamedPercent>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChampteamsNamedPercent {
    pub name: String,
    #[serde(default)]
    pub percent: f32,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChampteamsCombos {
    #[serde(default)]
    pub pairs: Vec<ChampteamsCombo>,
    #[serde(default)]
    pub trios: Vec<ChampteamsCombo>,
    #[serde(default)]
    pub teams: Vec<ChampteamsCombo>,
    #[serde(default)]
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChampteamsCombo {
    #[serde(default)]
    pub rank: u32,
    #[serde(default)]
    pub score: f32,
    #[serde(default)]
    pub win_rate: Option<f32>,
    #[serde(default)]
    pub play_rate: Option<f32>,
    #[serde(default)]
    pub appearances: u32,
    #[serde(default)]
    pub pokemon: Vec<ChampteamsComboMember>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChampteamsComboMember {
    pub name: String,
    #[serde(default)]
    pub sprite_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChampteamsSet {
    pub name: String,
    #[serde(default)]
    pub item: Option<String>,
    #[serde(default)]
    pub ability: Option<String>,
    #[serde(default)]
    pub moves: Vec<String>,
    #[serde(default)]
    pub nature: Option<String>,
    #[serde(default)]
    pub role: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn list_with_formula(formula: &str) -> ChampteamsTierList {
        ChampteamsTierList {
            tiers: Vec::new(),
            snapshot_date: None,
            formula: Some(formula.to_string()),
            data_range: None,
        }
    }

    /// The exact sentence the live endpoint returns today.
    #[test]
    fn reads_the_regulation_out_of_the_real_formula_text() {
        let list = list_with_formula(
            "Meta score is a results-led composite, not a 0-100 rating. It blends four \
             signals from Limitless Champions M-B tournaments of 30 or more players: \
             tournament usage, win rate, top-cut conversion, and event wins.",
        );
        assert_eq!(list.declared_regulation(), Some("M-B".to_string()));
    }

    /// When the source catches up, the label has to follow on its own - that
    /// is the whole point of reading it from the payload.
    #[test]
    fn follows_the_source_when_it_moves_to_a_new_regulation() {
        let list = list_with_formula("...from Limitless Champions M-C tournaments...");
        assert_eq!(list.declared_regulation(), Some("M-C".to_string()));
    }

    #[test]
    fn unknown_provenance_is_none_rather_than_a_guess() {
        assert_eq!(
            list_with_formula("no regulation named here").declared_regulation(),
            None
        );
        assert_eq!(
            ChampteamsTierList {
                tiers: Vec::new(),
                snapshot_date: None,
                formula: None,
                data_range: None,
            }
            .declared_regulation(),
            None
        );
    }

    #[test]
    fn does_not_match_a_longer_token() {
        assert_eq!(
            list_with_formula("something M-Bx here").declared_regulation(),
            None
        );
        assert_eq!(list_with_formula("trailing M-").declared_regulation(), None);
    }

    #[test]
    fn matches_at_the_very_end_of_the_text() {
        assert_eq!(
            list_with_formula("tournaments from M-C").declared_regulation(),
            Some("M-C".to_string())
        );
    }

    /// Upstream renames and drops fields without warning; a payload missing
    /// everything optional must still deserialize rather than failing the
    /// whole snapshot.
    #[test]
    fn a_minimal_payload_still_deserializes() {
        let json = r#"{"tiers":[{"tier":"S","pokemon":[{"name":"Kingambit"}]}]}"#;
        let list: ChampteamsTierList = serde_json::from_str(json).expect("should parse");
        assert_eq!(list.total_pokemon(), 1);
        assert_eq!(list.tiers[0].pokemon[0].win_rate, None);
        assert_eq!(list.declared_regulation(), None);
    }

    #[test]
    fn parses_the_camel_case_fields_the_api_actually_sends() {
        let json = r#"{
            "tiers":[{"tier":"S","pokemon":[{
                "name":"Kingambit","metaScore":167.08,"tournamentUsage":8.2,"winRate":52.1,
                "items":[{"name":"Life Orb","percent":31.2}],
                "usageAbilities":[{"name":"Defiant","percent":98.4}]
            }]}],
            "snapshotDate":"2026-09-09",
            "dataRange":{"earliest":"2026-06-17","latest":"2026-09-07","tournamentCount":243,"teamCount":12113}
        }"#;
        let list: ChampteamsTierList = serde_json::from_str(json).expect("should parse");
        let mon = &list.tiers[0].pokemon[0];
        assert_eq!(mon.win_rate, Some(52.1));
        assert_eq!(mon.tournament_usage, Some(8.2));
        assert_eq!(mon.items[0].name, "Life Orb");
        assert_eq!(mon.usage_abilities[0].name, "Defiant");
        let range = list.data_range.expect("dataRange should parse");
        assert_eq!(range.team_count, 12_113);
        assert_eq!(range.tournament_count, 243);
    }

    #[test]
    fn parses_a_combos_payload() {
        let json = r#"{"pairs":[{"rank":1,"score":90.8,"winRate":58.9,"playRate":7.4,
            "appearances":148,"pokemon":[{"id":"sneasler","name":"Sneasler","spriteId":"sneasler"}]}],
            "trios":[],"teams":[],"updatedAt":"2026-09-10T01:19:53.626Z"}"#;
        let combos: ChampteamsCombos = serde_json::from_str(json).expect("should parse");
        assert_eq!(combos.pairs.len(), 1);
        assert_eq!(combos.pairs[0].win_rate, Some(58.9));
        assert_eq!(combos.pairs[0].pokemon[0].name, "Sneasler");
    }

    #[test]
    fn parses_a_default_set() {
        let json = r#"{"venusaurmega":{"name":"Venusaur-Mega","item":"Venusaurite",
            "ability":"Chlorophyll","moves":["Protect","Earth Power","Sludge Bomb","Giga Drain"],
            "nature":"Modest","evs":{"hp":2},"role":"Bulky special"}}"#;
        let sets: HashMap<String, ChampteamsSet> =
            serde_json::from_str(json).expect("should parse");
        let set = &sets["venusaurmega"];
        assert_eq!(set.item.as_deref(), Some("Venusaurite"));
        assert_eq!(set.moves.len(), 4);
        assert_eq!(set.role.as_deref(), Some("Bulky special"));
    }
}
