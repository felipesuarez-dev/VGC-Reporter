use crate::adapters::HttpClient;
use crate::config;
use crate::error::AppError;
use std::sync::Arc;

/// Client for pokepast.es: resolves `/<hash>/raw` to the plain-text Showdown
/// export for a team. Pastes are immutable, so the HTTP cache TTL is long.
#[derive(Clone)]
pub struct PokepasteClient {
    http: Arc<HttpClient>,
}

impl PokepasteClient {
    pub fn new(http: Arc<HttpClient>) -> Self {
        Self { http }
    }

    /// Resolve a paste URL to its member list. Returns an empty Vec when the
    /// paste is missing or unparsable; top-teams should fall back to the
    /// labmaus minimal data in that case rather than hard-failing.
    pub async fn get_team(&self, url: &str) -> Result<Vec<ShowdownEntry>, AppError> {
        let raw_url = raw_paste_url(url);
        let bytes = self
            .http
            .get_cached_with_headers(&raw_url, &[("Accept", "text/plain")], config::TTL_POKEPASTE)
            .await?;
        let text = std::str::from_utf8(&bytes)
            .map_err(|e| AppError::Internal(format!("pokepaste utf8: {e}")))?;
        Ok(parse_pokepaste_export(text))
    }
}

fn raw_paste_url(url: &str) -> String {
    let trimmed = url.trim_end_matches('/');
    if trimmed.ends_with("/raw") {
        trimmed.to_string()
    } else {
        format!("{}/raw", trimmed)
    }
}

#[derive(Debug, Clone, Default)]
pub struct ShowdownEntry {
    pub species: String,
    pub nickname: Option<String>,
    pub gender: Option<char>,
    pub item: Option<String>,
    pub ability: Option<String>,
    pub level: Option<u8>,
    pub tera_type: Option<String>,
    pub evs: Option<StatSpread>,
    pub ivs: Option<StatSpread>,
    pub nature: Option<String>,
    pub moves: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct StatSpread {
    pub hp: u8,
    pub atk: u8,
    pub def: u8,
    pub spa: u8,
    pub spd: u8,
    pub spe: u8,
}

pub fn parse_pokepaste_export(text: &str) -> Vec<ShowdownEntry> {
    let normalized = text.replace("\r\n", "\n");
    normalized
        .split("\n\n")
        .filter_map(parse_block)
        .filter(|e| !e.species.is_empty())
        .collect()
}

fn parse_block(block: &str) -> Option<ShowdownEntry> {
    let mut lines = block.lines().filter(|l| !l.trim().is_empty());
    let header = lines.next()?;
    let mut entry = parse_header(header);

    for line in lines {
        let trimmed = line.trim();
        if let Some(rest) = trimmed.strip_prefix("Ability:") {
            entry.ability = Some(rest.trim().to_string());
        } else if let Some(rest) = trimmed.strip_prefix("Level:") {
            entry.level = rest.trim().parse().ok();
        } else if let Some(rest) = trimmed.strip_prefix("Tera Type:") {
            entry.tera_type = Some(rest.trim().to_string());
        } else if let Some(rest) = trimmed.strip_prefix("EVs:") {
            entry.evs = parse_spread(rest);
        } else if let Some(rest) = trimmed.strip_prefix("IVs:") {
            entry.ivs = parse_spread(rest);
        } else if let Some(mv) = trimmed.strip_prefix("- ") {
            entry.moves.push(mv.trim().to_string());
        } else if let Some(nature) = trimmed.strip_suffix(" Nature") {
            entry.nature = Some(nature.trim().to_string());
        }
    }

    if entry.species.is_empty() {
        return None;
    }
    Some(entry)
}

/// Parse the first line of a block. Valid shapes:
///   Species @ Item
///   Species
///   Nickname (Species) @ Item
///   Nickname (Species) (M) @ Item
///   Species (M) @ Item
fn parse_header(header: &str) -> ShowdownEntry {
    let mut entry = ShowdownEntry::default();
    let (left, item) = match header.rsplit_once(" @ ") {
        Some((l, r)) => (l.trim(), Some(r.trim().to_string())),
        None => (header.trim(), None),
    };
    entry.item = item;

    let (left, gender) = strip_trailing_gender(left);
    let (species, nickname) = extract_species(left);
    entry.species = species;
    entry.nickname = nickname;
    entry.gender = gender;
    entry
}

fn strip_trailing_gender(s: &str) -> (&str, Option<char>) {
    let trimmed = s.trim_end();
    for marker in ["(M)", "(F)"] {
        if let Some(stripped) = trimmed.strip_suffix(marker) {
            let gender = marker.chars().nth(1);
            return (stripped.trim_end(), gender);
        }
    }
    (trimmed, None)
}

fn extract_species(s: &str) -> (String, Option<String>) {
    // Look for a trailing "(Species)" group. Nickname may itself contain
    // parentheses, so we only take the LAST balanced group.
    let trimmed = s.trim();
    if !trimmed.ends_with(')') {
        return (trimmed.to_string(), None);
    }
    if let Some(open) = trimmed.rfind(" (") {
        let inside = &trimmed[open + 2..trimmed.len() - 1];
        let nickname = trimmed[..open].trim().to_string();
        if nickname.is_empty() {
            return (inside.to_string(), None);
        }
        return (inside.to_string(), Some(nickname));
    }
    (trimmed.to_string(), None)
}

fn parse_spread(rest: &str) -> Option<StatSpread> {
    let mut spread = StatSpread::default();
    let mut any = false;
    for chunk in rest.split('/') {
        let chunk = chunk.trim();
        let mut parts = chunk.splitn(2, ' ');
        let value: u8 = parts.next()?.trim().parse().ok()?;
        let stat = parts.next()?.trim();
        match stat {
            "HP" => spread.hp = value,
            "Atk" => spread.atk = value,
            "Def" => spread.def = value,
            "SpA" => spread.spa = value,
            "SpD" => spread.spd = value,
            "Spe" => spread.spe = value,
            _ => continue,
        }
        any = true;
    }
    if any {
        Some(spread)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE: &str = include_str!("pokepaste_sample.txt");

    #[test]
    fn parses_real_export() {
        let team = parse_pokepaste_export(SAMPLE);
        assert!(team.len() >= 3, "expected at least 3 members in sample");
        let first = &team[0];
        assert!(!first.species.is_empty());
        assert!(first.item.is_some());
        assert!(first.ability.is_some());
        assert!(!first.moves.is_empty());
    }

    #[test]
    fn parses_header_with_nickname_and_gender() {
        let header = "Spicy (Incineroar) (M) @ Safety Goggles";
        let entry = parse_header(header);
        assert_eq!(entry.species, "Incineroar");
        assert_eq!(entry.nickname.as_deref(), Some("Spicy"));
        assert_eq!(entry.gender, Some('M'));
        assert_eq!(entry.item.as_deref(), Some("Safety Goggles"));
    }

    #[test]
    fn parses_header_without_nickname() {
        let entry = parse_header("Amoonguss @ Rocky Helmet");
        assert_eq!(entry.species, "Amoonguss");
        assert!(entry.nickname.is_none());
        assert_eq!(entry.item.as_deref(), Some("Rocky Helmet"));
    }

    #[test]
    fn parses_evs_and_nature() {
        let block = "Incineroar @ Safety Goggles\n\
Ability: Intimidate\n\
Level: 50\n\
Tera Type: Ghost\n\
EVs: 252 HP / 4 Def / 252 SpD\n\
Sassy Nature\n\
- Fake Out\n\
- Knock Off\n\
- Flare Blitz\n\
- Parting Shot";
        let entry = parse_block(block).unwrap();
        assert_eq!(entry.species, "Incineroar");
        assert_eq!(entry.ability.as_deref(), Some("Intimidate"));
        assert_eq!(entry.level, Some(50));
        assert_eq!(entry.tera_type.as_deref(), Some("Ghost"));
        assert_eq!(entry.nature.as_deref(), Some("Sassy"));
        let evs = entry.evs.unwrap();
        assert_eq!(evs.hp, 252);
        assert_eq!(evs.def, 4);
        assert_eq!(evs.spd, 252);
        assert_eq!(entry.moves.len(), 4);
    }

    #[test]
    fn raw_url_normalisation() {
        assert_eq!(
            raw_paste_url("https://pokepast.es/abc"),
            "https://pokepast.es/abc/raw"
        );
        assert_eq!(
            raw_paste_url("https://pokepast.es/abc/"),
            "https://pokepast.es/abc/raw"
        );
        assert_eq!(
            raw_paste_url("https://pokepast.es/abc/raw"),
            "https://pokepast.es/abc/raw"
        );
    }
}
