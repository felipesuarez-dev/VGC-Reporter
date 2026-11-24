use chrono::{Datelike, NaiveDate};
use std::collections::HashSet;

/// Types of Championship Series events. Different sites use different labels
/// (`International`, `LAIC`, `International Championship São Paulo`, ...), so
/// we normalise them before comparing names.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EventType {
    World,
    International,
    Regional,
    Special,
    Other,
}

pub fn event_type(name: &str) -> EventType {
    let normalized = normalize_event_name(name);
    if normalized.contains("world") {
        EventType::World
    } else if normalized.contains("international")
        || normalized.contains("laic")
        || normalized.contains("naic")
        || normalized.contains("euic")
    {
        EventType::International
    } else if normalized.contains("regional") {
        EventType::Regional
    } else if normalized.contains("special") {
        EventType::Special
    } else {
        EventType::Other
    }
}

/// Region keys used by the Internationals. They are deliberately broader than
/// a city so `Latin America` and `LAIC` resolve to the same event.
pub fn region_key(name: &str) -> Option<&'static str> {
    let normalized = normalize_event_name(name);
    if normalized.contains("latin america")
        || normalized.contains("south america")
        || normalized.contains("laic")
    {
        Some("latin-america")
    } else if normalized.contains("north america") || normalized.contains("naic") {
        Some("north-america")
    } else if normalized.contains("europe") || normalized.contains("euic") {
        Some("europe")
    } else if normalized.contains("world") {
        Some("worlds")
    } else {
        None
    }
}

/// Lowercase, remove diacritics and collapse punctuation to spaces. Keeps the
/// words intact so `São Paulo`, `Sao Paulo` and `SAO-PAULO` compare equal.
pub fn normalize_event_name(name: &str) -> String {
    let mut out = String::with_capacity(name.len());
    for ch in name.chars() {
        let mapped = match ch {
            'á' | 'à' | 'ä' | 'â' | 'ã' | 'å' => 'a',
            'é' | 'è' | 'ë' | 'ê' => 'e',
            'í' | 'ì' | 'ï' | 'î' => 'i',
            'ó' | 'ò' | 'ö' | 'ô' | 'õ' => 'o',
            'ú' | 'ù' | 'ü' | 'û' => 'u',
            'ñ' => 'n',
            'ç' => 'c',
            'Á' | 'À' | 'Ä' | 'Â' | 'Ã' | 'Å' => 'a',
            'É' | 'È' | 'Ë' | 'Ê' => 'e',
            'Í' | 'Ì' | 'Ï' | 'Î' => 'i',
            'Ó' | 'Ò' | 'Ö' | 'Ô' | 'Õ' => 'o',
            'Ú' | 'Ù' | 'Ü' | 'Û' => 'u',
            'Ñ' => 'n',
            'Ç' => 'c',
            c if c.is_ascii_alphanumeric() => c.to_ascii_lowercase(),
            _ => ' ',
        };
        out.push(mapped);
    }
    out.split_whitespace().collect::<Vec<_>>().join(" ")
}

const STOPWORDS: &[&str] = &[
    "the",
    "of",
    "and",
    "de",
    "la",
    "el",
    "los",
    "las",
    "do",
    "da",
    "dos",
    "das",
    "pokemon",
    "vgc",
    "championship",
    "championships",
    "champion",
    "tournament",
    "tournaments",
    "event",
    "presented",
    "by",
    "official",
    "international",
    "regional",
    "special",
    "world",
];

fn is_year(token: &str) -> bool {
    token.len() == 4 && token.chars().all(|c| c.is_ascii_digit())
}

/// Meaningful name tokens. `LAIC`/`NAIC`/`EUIC` expand to their region so a
/// site that only uses the acronym still matches.
pub fn significant_tokens(name: &str) -> HashSet<String> {
    let normalized = normalize_event_name(name);
    let mut out = HashSet::new();
    for token in normalized.split_whitespace() {
        match token {
            "laic" => {
                out.insert("latin".to_string());
                out.insert("america".to_string());
            }
            "naic" => {
                out.insert("north".to_string());
                out.insert("america".to_string());
            }
            "euic" => {
                out.insert("europe".to_string());
                out.insert("international".to_string());
            }
            _ if STOPWORDS.contains(&token) || is_year(token) => {}
            _ => {
                out.insert(token.to_string());
            }
        }
    }
    out
}

pub fn token_overlap(a: &str, b: &str) -> usize {
    let left = significant_tokens(a);
    let right = significant_tokens(b);
    left.intersection(&right).count()
}

fn date_distance(a: NaiveDate, b: NaiveDate) -> i64 {
    (a - b).num_days().abs()
}

/// Score a candidate. `None` means the candidate is definitely another event.
/// The score is used to pick the best row when a listing contains several
/// tournaments in the same week.
pub fn event_match_score(
    official: &str,
    official_date: Option<NaiveDate>,
    candidate: &str,
    candidate_date: Option<NaiveDate>,
) -> Option<i32> {
    let official_type = event_type(official);
    let candidate_type = event_type(candidate);
    if official_type != EventType::Other
        && candidate_type != EventType::Other
        && official_type != candidate_type
    {
        return None;
    }

    let official_region = region_key(official);
    let candidate_region = region_key(candidate);
    if let (Some(a), Some(b)) = (official_region, candidate_region) {
        if a != b {
            return None;
        }
    }

    if let (Some(a), Some(b)) = (official_date, candidate_date) {
        let distance = date_distance(a, b);
        if distance > 2 {
            return None;
        }
    }

    let overlap = token_overlap(official, candidate) as i32;
    let region_match = official_region.is_some() && official_region == candidate_region;
    let type_match = official_type != EventType::Other && official_type == candidate_type;
    let date_bonus = match (official_date, candidate_date) {
        (Some(a), Some(b)) => match date_distance(a, b) {
            0 => 4,
            1 | 2 => 3,
            _ => return None,
        },
        _ => 0,
    };

    // A pure date+type collision (two different Internationals) is suspicious;
    // require at least one name token, a shared region or an exact date.
    if overlap == 0 && !region_match {
        let exact_date = matches!(
            (official_date, candidate_date),
            (Some(a), Some(b)) if a == b
        );
        if !(exact_date && type_match) {
            return None;
        }
    }

    let score = overlap * 3
        + if region_match { 3 } else { 0 }
        + if type_match { 2 } else { 0 }
        + date_bonus;
    if score < 4 {
        return None;
    }
    Some(score)
}

pub fn same_event(
    official: &str,
    official_date: Option<NaiveDate>,
    candidate: &str,
    candidate_date: Option<NaiveDate>,
) -> bool {
    event_match_score(official, official_date, candidate, candidate_date)
        .is_some_and(|score| score >= 6)
}

/// Parse the date format used by PokéBase listing cards: `Nov 20, 2026` or
/// `Nov 20–22, 2026`. Returns the start date.
pub fn parse_listing_date(raw: &str) -> Option<NaiveDate> {
    let trimmed = raw.trim().replace(['–', '—'], "-");
    let re = regex::Regex::new(
        r"(?i)^([a-z]{3,9})\s+(\d{1,2})(?:\s*[-–—]\s*(?:([a-z]{3,9})\s+)?(\d{1,2}))?,?\s+(\d{4})$",
    )
    .ok()?;
    let capture = re.captures(&trimmed)?;
    let month = match capture.get(1)?.as_str().to_ascii_lowercase().as_str() {
        "jan" | "january" => 1,
        "feb" | "february" => 2,
        "mar" | "march" => 3,
        "apr" | "april" => 4,
        "may" => 5,
        "jun" | "june" => 6,
        "jul" | "july" => 7,
        "aug" | "august" => 8,
        "sep" | "sept" | "september" => 9,
        "oct" | "october" => 10,
        "nov" | "november" => 11,
        "dec" | "december" => 12,
        _ => return None,
    };
    let day = capture.get(2)?.as_str().parse::<u32>().ok()?;
    let year = capture.get(5)?.as_str().parse::<i32>().ok()?;
    NaiveDate::from_ymd_opt(year, month, day)
}

/// Parse an ISO `YYYY-MM-DD` date; tolerates an ISO timestamp.
pub fn parse_iso_date(raw: &str) -> Option<NaiveDate> {
    let date = raw.get(0..10)?;
    NaiveDate::parse_from_str(date, "%Y-%m-%d").ok()
}

/// Extract the season year from a name, for diagnostics/tests.
pub fn name_year(name: &str) -> Option<i32> {
    normalize_event_name(name)
        .split_whitespace()
        .filter(|token| is_year(token))
        .filter_map(|token| token.parse().ok())
        .next()
}

/// Approximate month/day label for a null date in tests; not used by the UI.
pub fn date_label(date: NaiveDate) -> String {
    format!("{} {}, {}", date.format("%b"), date.day(), date.year())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn date(raw: &str) -> NaiveDate {
        NaiveDate::parse_from_str(raw, "%Y-%m-%d").unwrap()
    }

    #[test]
    fn matches_laic_across_different_sites() {
        let official = "2027 Pokémon Latin America International Championships";
        let pokebase = "2027 Latin America Pokémon VGC International Championships";
        let zone = "2027 Latin America Pokémon VGC International Championships, Nov 20, 2026";
        let labs = "International Championship São Paulo";
        assert!(same_event(
            official,
            Some(date("2026-11-20")),
            pokebase,
            Some(date("2026-11-20"))
        ));
        assert!(same_event(
            official,
            Some(date("2026-11-20")),
            zone,
            Some(date("2026-11-20"))
        ));
        assert!(same_event(
            official,
            Some(date("2026-11-20")),
            labs,
            Some(date("2026-11-20"))
        ));
    }

    #[test]
    fn rejects_a_different_international() {
        assert!(!same_event(
            "2027 Pokémon North America International Championships",
            Some(date("2027-06-18")),
            "2027 Latin America Pokémon VGC International Championships",
            Some(date("2026-11-20"))
        ));
    }

    #[test]
    fn matches_regionals_by_city_and_type() {
        assert!(same_event(
            "2027 Louisville Regional Championships",
            Some(date("2026-10-09")),
            "2027 Louisville Pokémon VGC Regional Championships",
            Some(date("2026-10-09"))
        ));
        assert!(same_event(
            "2027 Stuttgart Regional Championships",
            Some(date("2026-11-28")),
            "Regional Championship Stuttgart",
            Some(date("2026-11-28"))
        ));
    }

    #[test]
    fn rejects_a_different_regional_in_the_same_month() {
        assert!(!same_event(
            "2027 Stuttgart Regional Championships",
            Some(date("2026-11-28")),
            "2027 Baltimore Pokémon VGC Regional Championships",
            Some(date("2026-09-18"))
        ));
    }

    #[test]
    fn parses_listing_dates_with_ranges() {
        assert_eq!(parse_listing_date("Nov 20, 2026"), Some(date("2026-11-20")));
        assert_eq!(
            parse_listing_date("Nov 20–22, 2026"),
            Some(date("2026-11-20"))
        );
        assert_eq!(
            parse_listing_date("Sep 5 - 7, 2026"),
            Some(date("2026-09-05"))
        );
        assert_eq!(
            parse_listing_date("October 31-November 1, 2026"),
            Some(date("2026-10-31"))
        );
        assert_eq!(
            parse_listing_date("Oct 31 – Nov 1, 2026"),
            Some(date("2026-10-31"))
        );
    }

    #[test]
    fn expands_acronyms() {
        assert_eq!(region_key("LAIC 2027"), Some("latin-america"));
        assert_eq!(region_key("NAIC 2027"), Some("north-america"));
        assert_eq!(region_key("EUIC 2027"), Some("europe"));
    }
}
