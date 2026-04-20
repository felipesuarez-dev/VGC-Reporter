use std::collections::HashSet;

/// Canonical form used for name comparisons across regulation rules:
/// lowercase, ascii-alphanumeric only. Strips spaces, dashes, apostrophes,
/// punctuation. Lets `"Choice Scarf"`, `"choice-scarf"`, `"CHOICESCARF"` all
/// collapse to the same key.
pub fn canonical(name: &str) -> String {
    name.chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .map(|c| c.to_ascii_lowercase())
        .collect()
}

/// Build a lookup set of canonicalised names from a static list.
pub fn lookup_set(slice: &[&'static str]) -> HashSet<String> {
    slice.iter().map(|s| canonical(s)).collect()
}

/// Form suffixes that represent gameplay mechanics that no current VGC
/// regulation permits (Mega Evolution, Gigantamax, Primal Reversion,
/// Eternamax). Stored canonical (lowercase, no separators) so they can
/// be matched against either dashed segments or their canonical join.
const FORBIDDEN_FORM_TOKENS: &[&str] = &[
    "mega", "megax", "megay", "primal", "gmax", "eternamax",
];

/// `true` if the species name carries a Mega/Gmax/Primal/Eternamax suffix.
/// Used to short-circuit the base-form fallback in regulation `matches`,
/// so that `"Charizard-Mega-X"` is rejected even though its base species
/// `"Charizard"` is on the allow-list.
pub fn has_forbidden_form_token(name: &str) -> bool {
    let mut parts = name.split('-');
    parts.next();
    let tail: Vec<String> = parts.map(|s| s.to_ascii_lowercase()).collect();
    if tail.is_empty() {
        return false;
    }
    let joined: String = tail.concat();
    if FORBIDDEN_FORM_TOKENS.iter().any(|t| *t == joined) {
        return true;
    }
    tail.iter()
        .any(|seg| FORBIDDEN_FORM_TOKENS.iter().any(|t| *t == seg))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn canonical_strips_spaces_dashes_punctuation() {
        assert_eq!(canonical("Choice Scarf"), "choicescarf");
        assert_eq!(canonical("Ho-Oh"), "hooh");
        assert_eq!(canonical("Farfetch'd"), "farfetchd");
        assert_eq!(canonical("Calyrex-Shadow"), "calyrexshadow");
    }

    #[test]
    fn lookup_set_dedupes() {
        let set = lookup_set(&["Mew", "mew", "MEW"]);
        assert_eq!(set.len(), 1);
        assert!(set.contains("mew"));
    }

    #[test]
    fn has_forbidden_form_token_detects_mega_variants() {
        assert!(has_forbidden_form_token("Charizard-Mega"));
        assert!(has_forbidden_form_token("Charizard-Mega-X"));
        assert!(has_forbidden_form_token("Charizard-Mega-Y"));
        assert!(has_forbidden_form_token("Garchomp-Mega"));
    }

    #[test]
    fn has_forbidden_form_token_detects_gmax_primal_eternamax() {
        assert!(has_forbidden_form_token("Pikachu-Gmax"));
        assert!(has_forbidden_form_token("Charizard-Gmax"));
        assert!(has_forbidden_form_token("Kyogre-Primal"));
        assert!(has_forbidden_form_token("Groudon-Primal"));
        assert!(has_forbidden_form_token("Eternatus-Eternamax"));
    }

    #[test]
    fn has_forbidden_form_token_lets_legal_forms_through() {
        assert!(!has_forbidden_form_token("Charizard"));
        assert!(!has_forbidden_form_token("Calyrex-Shadow"));
        assert!(!has_forbidden_form_token("Calyrex-Ice"));
        assert!(!has_forbidden_form_token("Slowking-Galar"));
        assert!(!has_forbidden_form_token("Vulpix-Alola"));
        assert!(!has_forbidden_form_token("Sneasel-Hisui"));
        assert!(!has_forbidden_form_token("Tauros-Paldea-Aqua"));
        assert!(!has_forbidden_form_token("Urshifu-Rapid-Strike"));
    }
}
