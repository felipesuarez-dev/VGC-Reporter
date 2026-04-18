//! Rolling date-window helper shared by labmaus-backed services.

use crate::config;

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

/// Canonical 14-day rolling window used by top-teams, meta snapshot and
/// trending so every labmaus consumer sees the same slice.
pub fn default_window() -> (String, String) {
    rolling_window(config::LABMAUS_WINDOW_DAYS)
}

/// Two consecutive `days`-day windows ending today in UTC.
/// Returns `((prev_from, prev_to), (curr_from, curr_to))` where `prev_to == curr_from`.
/// Used by trending to compute a delta between the previous and current week.
pub fn prev_and_current_windows(days: i64) -> ((String, String), (String, String)) {
    let today = chrono::Utc::now().date_naive();
    let mid = today - chrono::Duration::days(days);
    let prev_from = mid - chrono::Duration::days(days);
    let fmt = |d: chrono::NaiveDate| d.format("%Y-%m-%d").to_string();
    ((fmt(prev_from), fmt(mid)), (fmt(mid), fmt(today)))
}

#[cfg(test)]
mod tests {
    use super::*;

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
