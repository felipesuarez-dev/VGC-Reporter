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
}
