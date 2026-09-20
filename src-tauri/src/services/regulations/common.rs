use super::Violation;
use crate::domain::team::{Team, TEAM_SIZE};
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
const FORBIDDEN_FORM_TOKENS: &[&str] = &["mega", "megax", "megay", "primal", "gmax", "eternamax"];

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

/// Canonical allow-lists for a regulation with no restricted-legendary rules.
pub struct OpenRoster {
    pub species: HashSet<String>,
    pub items: HashSet<String>,
    pub moves: HashSet<String>,
}

impl OpenRoster {
    /// Union a base list with a delta into one canonical lookup set.
    pub fn union(base: &[&'static str], delta: &[&'static str]) -> HashSet<String> {
        base.iter()
            .chain(delta.iter())
            .map(|s| canonical(s))
            .collect()
    }

    /// `true` when `name` matches an entry in `set`, accounting for dashed
    /// Showdown form suffixes (`Calyrex-Shadow`, `Indeedee-F`) collapsing to
    /// the base entry. Mega forms that a regulation legalises are present as
    /// explicit entries, so they hit the direct match before the
    /// forbidden-form guard; off-list Mega/Gmax/Primal/Eternamax forms never
    /// collapse to their base.
    pub fn matches(set: &HashSet<String>, name: &str) -> bool {
        let c = canonical(name);
        if set.contains(&c) {
            return true;
        }
        if has_forbidden_form_token(name) {
            return false;
        }
        match name.split('-').next() {
            Some(base) => set.contains(&canonical(base)),
            None => false,
        }
    }

    /// Team legality for a regulation whose only rules are "every name must be
    /// on the allow-list" plus the universal completeness checks. Shared by
    /// M-B and M-C, which differ only in their lists; M-A keeps its own
    /// validator because it enforces restricted-legendary caps per season.
    pub fn validate(&self, team: &Team) -> Vec<Violation> {
        let mut out: Vec<Violation> = Vec::new();

        let filled: u8 = team
            .members
            .iter()
            .filter(|m| !m.species.trim().is_empty())
            .count() as u8;
        if (filled as usize) < TEAM_SIZE {
            out.push(Violation::TeamIncomplete { filled });
        }

        let mut seen_species: HashSet<String> = HashSet::new();

        for (idx, m) in team.members.iter().enumerate() {
            let raw = m.species.trim();
            if raw.is_empty() {
                continue;
            }
            let slot = (idx + 1) as u8;

            if !seen_species.insert(canonical(raw)) {
                out.push(Violation::DuplicateSpecies {
                    species: raw.to_string(),
                });
            }

            if !Self::matches(&self.species, raw) {
                out.push(Violation::SpeciesNotAllowed {
                    species: raw.to_string(),
                });
                continue;
            }

            match &m.item {
                Some(item) if !item.trim().is_empty() => {
                    let item_str = item.trim();
                    if !Self::matches(&self.items, item_str) {
                        out.push(Violation::ItemNotAllowed {
                            slot,
                            species: raw.to_string(),
                            item: item_str.to_string(),
                        });
                    }
                }
                _ => out.push(Violation::MissingItem {
                    slot,
                    species: raw.to_string(),
                }),
            }

            if m.ability.as_deref().unwrap_or("").trim().is_empty() {
                out.push(Violation::MissingAbility {
                    slot,
                    species: raw.to_string(),
                });
            }

            if m.nature.is_none() {
                out.push(Violation::MissingNature {
                    slot,
                    species: raw.to_string(),
                });
            }

            let valid_moves: Vec<&String> =
                m.moves.iter().filter(|s| !s.trim().is_empty()).collect();
            if valid_moves.len() < 4 {
                out.push(Violation::MissingMoves {
                    slot,
                    species: raw.to_string(),
                    have: valid_moves.len() as u8,
                    need: 4,
                });
            }
            for mv in &valid_moves {
                if !Self::matches(&self.moves, mv) {
                    out.push(Violation::MoveNotAllowed {
                        slot,
                        species: raw.to_string(),
                        mv: mv.to_string(),
                    });
                }
            }

            if m.evs.total() == 0 {
                out.push(Violation::EvsNotAssigned {
                    slot,
                    species: raw.to_string(),
                });
            }
        }

        out
    }
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
