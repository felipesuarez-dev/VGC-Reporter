//! Match records attached to tournament teams.
//!
//! Labmaus already returns a `record` string and a `placement` per team, and
//! the app never read either. They are the only first-hand win/loss data we
//! have, so deriving win rate from them is what makes the tier score ours
//! rather than a copy of somebody else's rating.

/// Parse a `"wins-losses-ties"` record.
///
/// Upstream is not consistent: two-part records (`"5-2"`) are common and the
/// field is sometimes empty or free text. Anything unparseable returns `None`
/// so the caller can skip that team rather than count a zero.
pub fn parse_record(raw: &str) -> Option<(u32, u32, u32)> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }
    let mut parts = trimmed.split('-');
    let wins = parts.next()?.trim().parse::<u32>().ok()?;
    let losses = parts.next()?.trim().parse::<u32>().ok()?;
    // Ties are optional; a missing third field means zero, but a present but
    // malformed one means the whole record is untrustworthy.
    let ties = match parts.next() {
        Some(t) => t.trim().parse::<u32>().ok()?,
        None => 0,
    };
    if parts.next().is_some() {
        return None;
    }
    Some((wins, losses, ties))
}

/// Running win/loss/top-cut tally for one species.
#[derive(Debug, Default, Clone, Copy, PartialEq)]
pub struct RecordTally {
    pub wins: u32,
    pub losses: u32,
    pub teams_with_record: u32,
    pub teams_seen: u32,
    pub top_cuts: u32,
}

/// Placement at or above which a team counts as having made top cut.
const TOP_CUT_PLACEMENT: u32 = 8;

impl RecordTally {
    pub fn add_team(&mut self, record: Option<&str>, placement: Option<u32>) {
        self.teams_seen += 1;
        if let Some((w, l, _ties)) = record.and_then(parse_record) {
            // A 0-0 record carries no information; counting it would drag the
            // denominator down without adding a single observed game.
            if w + l > 0 {
                self.wins += w;
                self.losses += l;
                self.teams_with_record += 1;
            }
        }
        if placement.is_some_and(|p| p > 0 && p <= TOP_CUT_PLACEMENT) {
            self.top_cuts += 1;
        }
    }

    pub fn games(&self) -> u32 {
        self.wins + self.losses
    }

    /// Win rate as a percentage. Ties are excluded from both sides rather than
    /// counted as half a win: the upstream data does not distinguish an
    /// intentional draw from a timeout, so treating them as neutral is the
    /// only defensible reading. `None` when nothing was observed.
    pub fn win_rate(&self) -> Option<f32> {
        let games = self.games();
        if games == 0 {
            return None;
        }
        Some(self.wins as f32 / games as f32 * 100.0)
    }

    /// Share of this species' teams that reached top cut, as a percentage.
    pub fn top_cut_rate(&self) -> Option<f32> {
        if self.teams_seen == 0 {
            return None;
        }
        Some(self.top_cuts as f32 / self.teams_seen as f32 * 100.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_a_three_part_record() {
        assert_eq!(parse_record("5-0-0"), Some((5, 0, 0)));
        assert_eq!(parse_record("6-2-1"), Some((6, 2, 1)));
    }

    /// Upstream emits both shapes.
    #[test]
    fn parses_a_two_part_record() {
        assert_eq!(parse_record("5-2"), Some((5, 2, 0)));
    }

    #[test]
    fn tolerates_surrounding_whitespace() {
        assert_eq!(parse_record("  4-1-0 "), Some((4, 1, 0)));
    }

    #[test]
    fn rejects_garbage_instead_of_counting_zero() {
        for raw in ["", "   ", "n/a", "5", "5-x-0", "5-1-0-2", "-", "5--1"] {
            assert_eq!(parse_record(raw), None, "{raw:?} should not parse");
        }
    }

    #[test]
    fn win_rate_is_none_without_games() {
        assert_eq!(RecordTally::default().win_rate(), None);
    }

    #[test]
    fn win_rate_ignores_ties() {
        let mut t = RecordTally::default();
        t.add_team(Some("6-2-4"), None);
        assert_eq!(t.games(), 8);
        assert_eq!(t.win_rate(), Some(75.0));
    }

    /// A 0-0 record is a team that never played; counting it would invent a
    /// game that did not happen.
    #[test]
    fn an_empty_record_does_not_create_games() {
        let mut t = RecordTally::default();
        t.add_team(Some("0-0-0"), None);
        assert_eq!(t.games(), 0);
        assert_eq!(t.win_rate(), None);
        assert_eq!(t.teams_seen, 1, "the team still counts toward usage");
    }

    #[test]
    fn accumulates_across_teams() {
        let mut t = RecordTally::default();
        t.add_team(Some("5-0-0"), Some(1));
        t.add_team(Some("3-2-0"), Some(20));
        assert_eq!(t.wins, 8);
        assert_eq!(t.losses, 2);
        assert_eq!(t.win_rate(), Some(80.0));
    }

    #[test]
    fn top_cut_counts_placements_inside_the_cut() {
        let mut t = RecordTally::default();
        t.add_team(Some("5-0-0"), Some(1));
        t.add_team(Some("5-0-0"), Some(8));
        t.add_team(Some("2-3-0"), Some(9));
        t.add_team(Some("2-3-0"), None);
        assert_eq!(t.top_cuts, 2);
        assert_eq!(t.top_cut_rate(), Some(50.0));
    }

    /// Placement is 1-indexed upstream; a zero is bad data, not a win.
    #[test]
    fn placement_zero_is_not_a_top_cut() {
        let mut t = RecordTally::default();
        t.add_team(Some("5-0-0"), Some(0));
        assert_eq!(t.top_cuts, 0);
    }
}
