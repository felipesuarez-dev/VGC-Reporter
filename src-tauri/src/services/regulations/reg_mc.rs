use super::common::OpenRoster;
use super::reg_ma_items::ALLOWED_ITEMS_MA;
use super::reg_ma_moves::ALLOWED_MOVES_MA;
use super::reg_ma_species::ALLOWED_SPECIES_MA;
use super::reg_mb_items::ALLOWED_ITEMS_MB_NEW;
use super::reg_mb_moves::ALLOWED_MOVES_MB_NEW;
use super::reg_mb_species::ALLOWED_SPECIES_MB_NEW;
use super::reg_mc_items::ALLOWED_ITEMS_MC_NEW;
use super::reg_mc_moves::ALLOWED_MOVES_MC_NEW;
use super::reg_mc_species::ALLOWED_SPECIES_MC_NEW;
use super::{RegulationRules, Violation};
use crate::domain::team::Team;

/// Pokémon Champions Regulation M-C (season M-6, 2026-09-09 → 2026-12-02).
///
/// Purely additive over M-B: every M-B species, item and move stays legal and
/// M-C layers 24 new species, 6 new Mega Evolutions (including the first three
/// "Z" Megas, which M-B banned) and their stones on top. Like M-B it has no
/// restricted legendaries, so there is no cap and no per-season enforcement —
/// validation is the shared [`OpenRoster`] path.
pub struct RegMcRules {
    roster: OpenRoster,
}

/// Union the M-A base, the M-B delta and the M-C delta into one lookup set.
fn union3(base: &[&'static str], d1: &[&'static str], d2: &[&'static str]) -> Vec<&'static str> {
    base.iter()
        .chain(d1.iter())
        .chain(d2.iter())
        .copied()
        .collect()
}

impl RegMcRules {
    pub fn current() -> Self {
        Self {
            roster: OpenRoster {
                species: OpenRoster::union(
                    &union3(
                        ALLOWED_SPECIES_MA,
                        ALLOWED_SPECIES_MB_NEW,
                        ALLOWED_SPECIES_MC_NEW,
                    ),
                    &[],
                ),
                items: OpenRoster::union(
                    &union3(ALLOWED_ITEMS_MA, ALLOWED_ITEMS_MB_NEW, ALLOWED_ITEMS_MC_NEW),
                    &[],
                ),
                moves: OpenRoster::union(
                    &union3(ALLOWED_MOVES_MA, ALLOWED_MOVES_MB_NEW, ALLOWED_MOVES_MC_NEW),
                    &[],
                ),
            },
        }
    }
}

impl RegulationRules for RegMcRules {
    fn code(&self) -> &'static str {
        "regulation-m-c"
    }

    fn allowed_species(&self) -> Vec<String> {
        union3(
            ALLOWED_SPECIES_MA,
            ALLOWED_SPECIES_MB_NEW,
            ALLOWED_SPECIES_MC_NEW,
        )
        .into_iter()
        .map(|s| s.to_string())
        .collect()
    }

    fn allowed_items(&self) -> Vec<String> {
        union3(ALLOWED_ITEMS_MA, ALLOWED_ITEMS_MB_NEW, ALLOWED_ITEMS_MC_NEW)
            .into_iter()
            .map(|s| s.to_string())
            .collect()
    }

    fn allowed_moves(&self) -> Vec<String> {
        union3(ALLOWED_MOVES_MA, ALLOWED_MOVES_MB_NEW, ALLOWED_MOVES_MC_NEW)
            .into_iter()
            .map(|s| s.to_string())
            .collect()
    }

    fn validate_team(&self, team: &Team) -> Vec<Violation> {
        self.roster.validate(team)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::evs::EvSpread;
    use crate::domain::nature::Nature;
    use crate::domain::team::TeamMember;
    use crate::domain::{format::Format, team::Team};

    fn member(species: &str, item: &str, moves: [&str; 4]) -> TeamMember {
        TeamMember {
            species: species.into(),
            item: Some(item.into()),
            ability: Some("Levitate".into()),
            nature: Some(Nature::Adamant),
            tera_type: None,
            moves: moves.iter().map(|m| (*m).into()).collect(),
            evs: EvSpread {
                hp: 252,
                atk: 252,
                spe: 4,
                ..Default::default()
            },
            level: 50,
            gender: None,
            shiny: false,
            nickname: None,
            ivs: Default::default(),
        }
    }

    const FILLER_MOVES: [&str; 4] = ["Earthquake", "Protect", "Rock Slide", "Iron Head"];

    /// A legal six-slot team whose first slot is the subject under test.
    fn team_with(species: &str, item: &str, moves: [&str; 4]) -> Team {
        let mut members = vec![member(species, item, moves)];
        for filler in [
            "Incineroar",
            "Rillaboom",
            "Sneasler",
            "Dragonite",
            "Farigiraf",
        ] {
            members.push(member(filler, "Leftovers", FILLER_MOVES));
        }
        Team {
            id: None,
            name: "t".into(),
            format: Format::RegulationMC,
            notes: None,
            members,
            created_at: None,
            updated_at: None,
        }
    }

    fn rules() -> RegMcRules {
        RegMcRules::current()
    }

    fn species_ok(r: &RegMcRules, name: &str) -> bool {
        !r.validate_team(&team_with(name, "Leftovers", FILLER_MOVES))
            .iter()
            .any(|v| matches!(v, Violation::SpeciesNotAllowed { species } if species == name))
    }

    fn item_ok(r: &RegMcRules, item: &str) -> bool {
        !r.validate_team(&team_with("Incineroar", item, FILLER_MOVES))
            .iter()
            .any(|v| matches!(v, Violation::ItemNotAllowed { .. }))
    }

    #[test]
    fn code_is_the_serde_slug() {
        assert_eq!(rules().code(), "regulation-m-c");
    }

    #[test]
    fn inherits_the_m_a_and_m_b_rosters() {
        let r = rules();
        assert!(species_ok(&r, "Incineroar"), "M-A species must stay legal");
        assert!(species_ok(&r, "Gholdengo"), "M-B species must stay legal");
        assert!(species_ok(&r, "Absol-Mega"), "M-B Mega must stay legal");
    }

    #[test]
    fn allows_the_new_m_c_species() {
        let r = rules();
        for s in [
            "Rillaboom",
            "Cinderace",
            "Inteleon",
            "Salamence",
            "Baxcalibur",
            "Golisopod",
            "Indeedee",
            "Mr. Mime",
            "Farfetch'd",
        ] {
            assert!(species_ok(&r, s), "{s} should be legal in M-C");
        }
    }

    /// The three Z Megas are M-C's headline addition and were banned in M-B,
    /// so they must be allowed here and nowhere earlier.
    #[test]
    fn allows_the_new_z_megas() {
        let r = rules();
        for s in ["Absol-Mega-Z", "Garchomp-Mega-Z", "Lucario-Mega-Z"] {
            assert!(species_ok(&r, s), "{s} should be legal in M-C");
        }
    }

    #[test]
    fn z_megas_are_not_legal_in_m_b() {
        let mb = super::super::RegMbRules::current();
        let team = team_with("Absol-Mega-Z", "Leftovers", FILLER_MOVES);
        assert!(
            mb.validate_team(&team)
                .iter()
                .any(|v| matches!(v, Violation::SpeciesNotAllowed { .. })),
            "Absol-Mega-Z must stay banned in M-B"
        );
    }

    #[test]
    fn allows_the_new_megas() {
        let r = rules();
        for s in ["Salamence-Mega", "Golisopod-Mega", "Baxcalibur-Mega"] {
            assert!(species_ok(&r, s), "{s} should be legal in M-C");
        }
    }

    /// Gendered and regional formes collapse to their base species, so they
    /// need no entry of their own — but they must actually pass.
    #[test]
    fn gendered_and_regional_formes_collapse_to_their_base() {
        let r = rules();
        for s in ["Indeedee-F", "Persian-Alola", "Toxtricity-Low-Key"] {
            assert!(species_ok(&r, s), "{s} should collapse to a legal base");
        }
    }

    /// An off-list Mega must never collapse to its (legal) base species.
    #[test]
    fn off_list_mega_is_still_rejected() {
        assert!(
            !species_ok(&rules(), "Rillaboom-Mega"),
            "a Mega with no explicit entry must be rejected"
        );
    }

    #[test]
    fn rejects_species_outside_every_roster() {
        assert!(!species_ok(&rules(), "Koraidon"));
    }

    /// Life Orb is the single most used item in the tournament data, yet it
    /// was absent from the allow-list, so the Team Builder rejected legal
    /// teams. Same for Choice Band (the list had only Choice Scarf).
    #[test]
    fn allows_the_items_that_were_wrongly_missing() {
        let r = rules();
        for item in [
            "Life Orb",
            "Choice Band",
            "Rocky Helmet",
            "Air Balloon",
            "Wide Lens",
            "Light Clay",
        ] {
            assert!(item_ok(&r, item), "{item} should be legal");
        }
    }

    #[test]
    fn allows_the_new_mega_stones() {
        let r = rules();
        for item in [
            "Salamencite",
            "Absolite Z",
            "Garchompite Z",
            "Lucarionite Z",
            "Baxcalibrite",
            "Golisopite",
        ] {
            assert!(item_ok(&r, item), "{item} should be legal");
        }
    }

    #[test]
    fn rejects_an_invented_item() {
        assert!(
            !item_ok(&rules(), "Golisopodite"),
            "upstream typo must not pass"
        );
    }

    #[test]
    fn allows_the_moves_that_were_wrongly_missing() {
        let team = team_with(
            "Salamence",
            "Life Orb",
            ["Dragon Claw", "High Horsepower", "Extreme Speed", "Protect"],
        );
        assert!(
            !rules()
                .validate_team(&team)
                .iter()
                .any(|v| matches!(v, Violation::MoveNotAllowed { .. })),
            "moves observed in real tournament data must be legal"
        );
    }

    #[test]
    fn rejects_an_invented_move() {
        let team = team_with(
            "Salamence",
            "Life Orb",
            ["Dragon Claw", "Protect", "Ice Shard", "Nonexistent Move"],
        );
        assert!(rules()
            .validate_team(&team)
            .iter()
            .any(|v| matches!(v, Violation::MoveNotAllowed { .. })));
    }

    #[test]
    fn a_fully_legal_m_c_team_has_no_violations() {
        let team = team_with(
            "Salamence-Mega",
            "Salamencite",
            ["Dragon Claw", "Protect", "Extreme Speed", "High Horsepower"],
        );
        assert_eq!(rules().validate_team(&team), Vec::new());
    }
}
