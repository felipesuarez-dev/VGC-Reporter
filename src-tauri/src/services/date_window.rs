//! Rolling date-window helper shared by labmaus-backed services.

use crate::config;
use crate::domain::format::Format;

/// Rolling date window ending today (UTC), spanning `days` days inclusive.
/// Returns `(from, to)` strings formatted as YYYY-MM-DD.
pub fn rolling_window(days: i64) -> (String, String) {
    let today = chrono::Utc::now().date_naive();
    let from = today - chrono::Duration::days(days);
    (
        from.format("%Y-%m-%d").to_string(),
        today.format("%Y-%m-%d").to_string(),
    )
}

/// Canonical 14-day rolling window used as the fallback for formats with no
/// fixed regulation range.
pub fn default_window() -> (String, String) {
    rolling_window(config::LABMAUS_WINDOW_DAYS)
}

/// Date window bounded by the regulation's own calendar so each format only
/// aggregates data from its active period — e.g. M-B starts on its launch date
/// (2026-06-17), not a rolling 14 days that would bleed M-A teams in. Formats
/// with no fixed range (`data_window() == None`) fall back to the rolling
/// window. The open end of an ongoing regulation is clamped to today.
pub fn window_for(format: Format) -> (String, String) {
    match format.data_window() {
        Some((start, end)) => {
            let today = chrono::Utc::now().date_naive();
            let to = end.unwrap_or(today).min(today);
            (
                start.format("%Y-%m-%d").to_string(),
                to.format("%Y-%m-%d").to_string(),
            )
        }
        None => default_window(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn m_a_window_is_bounded_to_its_closed_calendar() {
        // M-A (closed M-2 season) is capped to its final fortnight because
        // labmaus times out for wider windows. Deterministic regardless of
        // "today" (any date past the end clamps to the end).
        let (from, to) = window_for(Format::RegulationMA);
        assert_eq!(from, "2026-06-03");
        assert_eq!(to, "2026-06-16");
    }

    #[test]
    fn m_b_window_starts_at_its_launch_not_a_rolling_window() {
        // M-B is ongoing: starts at its launch date, ends today (>= launch).
        let (from, to) = window_for(Format::RegulationMB);
        assert_eq!(from, "2026-06-17");
        assert!(to >= from, "to ({to}) should be >= from ({from})");
    }

    #[test]
    fn rolling_14_days_is_inclusive_format() {
        let (from, to) = rolling_window(14);
        assert_eq!(from.len(), 10);
        assert_eq!(to.len(), 10);
        assert!(from.as_bytes()[4] == b'-' && from.as_bytes()[7] == b'-');
        assert!(to.as_bytes()[4] == b'-' && to.as_bytes()[7] == b'-');
        // `to` is strictly >= `from` (lexicographic works on ISO dates).
        assert!(to >= from);
    }
}
