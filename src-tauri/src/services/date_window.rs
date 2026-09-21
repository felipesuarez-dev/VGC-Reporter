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

/// Largest span labmaus `discover_teams` will serve before timing out
/// server-side. Verified against the live API: a 2026-06-17 -> 2026-09-20
/// request returns HTTP 503, while the same range split into chunks succeeds.
pub const MAX_LABMAUS_SPAN_DAYS: i64 = 21;

/// Split an inclusive `[from, to]` range into consecutive chunks no longer
/// than [`MAX_LABMAUS_SPAN_DAYS`], formatted as YYYY-MM-DD pairs.
///
/// A whole regulation is months long, so asking for it in one request fails.
/// Chunks are contiguous and non-overlapping, so a tournament lands in exactly
/// one of them and totals stay correct without de-duplication by date (callers
/// still de-duplicate by team URL, since a team can appear in two tournaments).
pub fn chunk_window(from: chrono::NaiveDate, to: chrono::NaiveDate) -> Vec<(String, String)> {
    if to < from {
        return Vec::new();
    }
    let step = chrono::Duration::days(MAX_LABMAUS_SPAN_DAYS);
    let mut out = Vec::new();
    let mut start = from;
    while start <= to {
        let end = (start + step - chrono::Duration::days(1)).min(to);
        out.push((
            start.format("%Y-%m-%d").to_string(),
            end.format("%Y-%m-%d").to_string(),
        ));
        start = end + chrono::Duration::days(1);
    }
    out
}

/// Same as [`window_for`], but split into labmaus-sized chunks.
pub fn chunked_window_for(format: Format) -> Vec<(String, String)> {
    let (from, to) = window_for(format);
    let parse = |s: &str| chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").ok();
    match (parse(&from), parse(&to)) {
        (Some(f), Some(t)) => chunk_window(f, t),
        // window_for always formats valid dates, so this is unreachable in
        // practice; degrade to the single un-chunked window rather than
        // returning nothing and silently showing an empty meta.
        _ => vec![(from, to)],
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

    #[test]
    fn a_short_window_is_one_chunk() {
        let d = |m, day| chrono::NaiveDate::from_ymd_opt(2026, m, day).unwrap();
        let chunks = chunk_window(d(9, 9), d(9, 20));
        assert_eq!(chunks, vec![("2026-09-09".into(), "2026-09-20".into())]);
    }

    #[test]
    fn a_single_day_is_one_chunk() {
        let d = chrono::NaiveDate::from_ymd_opt(2026, 9, 9).unwrap();
        assert_eq!(
            chunk_window(d, d),
            vec![("2026-09-09".into(), "2026-09-09".into())]
        );
    }

    #[test]
    fn exactly_the_limit_stays_one_chunk() {
        let d = |m, day| chrono::NaiveDate::from_ymd_opt(2026, m, day).unwrap();
        // 09-01..09-21 inclusive is 21 days.
        assert_eq!(chunk_window(d(9, 1), d(9, 21)).len(), 1);
    }

    #[test]
    fn one_day_over_the_limit_splits() {
        let d = |m, day| chrono::NaiveDate::from_ymd_opt(2026, m, day).unwrap();
        let chunks = chunk_window(d(9, 1), d(9, 22));
        assert_eq!(chunks.len(), 2);
        assert_eq!(chunks[0], ("2026-09-01".into(), "2026-09-21".into()));
        assert_eq!(chunks[1], ("2026-09-22".into(), "2026-09-22".into()));
    }

    /// The case that made this necessary: a full M-B season in one request
    /// returns 503 upstream.
    #[test]
    fn a_full_season_splits_into_contiguous_chunks() {
        let d = |m, day| chrono::NaiveDate::from_ymd_opt(2026, m, day).unwrap();
        let chunks = chunk_window(d(6, 17), d(9, 8));
        assert!(chunks.len() > 1);
        assert_eq!(chunks.first().unwrap().0, "2026-06-17");
        assert_eq!(chunks.last().unwrap().1, "2026-09-08");
        for pair in chunks.windows(2) {
            let prev_end = chrono::NaiveDate::parse_from_str(&pair[0].1, "%Y-%m-%d").unwrap();
            let next_start = chrono::NaiveDate::parse_from_str(&pair[1].0, "%Y-%m-%d").unwrap();
            assert_eq!(
                next_start,
                prev_end + chrono::Duration::days(1),
                "chunks must be contiguous and non-overlapping"
            );
        }
    }

    #[test]
    fn an_inverted_range_yields_nothing() {
        let d = |m, day| chrono::NaiveDate::from_ymd_opt(2026, m, day).unwrap();
        assert!(chunk_window(d(9, 20), d(9, 9)).is_empty());
    }

    #[test]
    fn the_active_regulation_chunks_cover_its_window() {
        let chunks = chunked_window_for(Format::RegulationMC);
        assert!(!chunks.is_empty());
        assert_eq!(chunks.first().unwrap().0, "2026-09-09");
    }
}
