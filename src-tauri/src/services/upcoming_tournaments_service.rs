use crate::adapters::{LimitlessClient, LimitlessTournamentSummary};
use crate::domain::UpcomingTournament;
use crate::error::AppError;
use chrono::{Duration, NaiveDate, Utc};

const LIMITLESS_TOURNAMENT_URL: &str = "https://play.limitlesstcg.com/tournament";
const LIMITLESS_SOURCE: &str = "limitless";
const WINDOW_DAYS: i64 = 30;

#[derive(Clone)]
pub struct UpcomingTournamentsService {
    limitless: LimitlessClient,
}

impl UpcomingTournamentsService {
    pub fn new(limitless: LimitlessClient) -> Self {
        Self { limitless }
    }

    pub async fn list_upcoming(&self) -> Result<Vec<UpcomingTournament>, AppError> {
        let today = Utc::now().date_naive();
        let window_end = today + Duration::days(WINDOW_DAYS);

        let raw = self.limitless.list_all_vgc(200).await?;
        let fetched = raw.len();
        let mut with_date = 0usize;
        let mut upcoming: Vec<UpcomingTournament> = raw
            .into_iter()
            .filter_map(|t| {
                if t.date.is_some() {
                    with_date += 1;
                }
                to_upcoming(t, today, window_end)
            })
            .collect();
        upcoming.sort_by(|a, b| a.date.cmp(&b.date));
        tracing::info!(
            fetched,
            with_date,
            kept = upcoming.len(),
            today = %today,
            window_end = %window_end,
            window_days = WINDOW_DAYS,
            "upcoming tournaments filtered"
        );
        Ok(upcoming)
    }
}

fn to_upcoming(
    t: LimitlessTournamentSummary,
    today: NaiveDate,
    window_end: NaiveDate,
) -> Option<UpcomingTournament> {
    let raw_date = t.date.as_deref()?;
    let parsed = parse_date(raw_date)?;
    if parsed <= today || parsed > window_end {
        return None;
    }
    Some(UpcomingTournament {
        id: t.id.clone(),
        name: t.name,
        date: parsed.format("%Y-%m-%d").to_string(),
        url: format!("{}/{}", LIMITLESS_TOURNAMENT_URL, t.id),
        region: t.format,
        players: t.players,
        source: LIMITLESS_SOURCE.to_string(),
    })
}

fn parse_date(raw: &str) -> Option<NaiveDate> {
    if let Ok(d) = NaiveDate::parse_from_str(raw, "%Y-%m-%d") {
        return Some(d);
    }
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(raw) {
        return Some(dt.date_naive());
    }
    if let Ok(d) = NaiveDate::parse_from_str(raw, "%d/%m/%Y") {
        return Some(d);
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_date_accepts_multiple_formats() {
        assert!(parse_date("2026-05-01").is_some());
        assert!(parse_date("2026-05-01T18:00:00Z").is_some());
        assert!(parse_date("01/05/2026").is_some());
        assert!(parse_date("nonsense").is_none());
    }

    #[test]
    fn to_upcoming_filters_past_and_far_future() {
        let today = NaiveDate::from_ymd_opt(2026, 4, 17).unwrap();
        let window = today + Duration::days(14);
        let mk = |id: &str, date: Option<&str>| LimitlessTournamentSummary {
            id: id.into(),
            name: format!("Event {}", id),
            date: date.map(str::to_string),
            players: Some(80),
            format: Some("M-A".into()),
            organizer_id: None,
            game: None,
        };
        assert!(to_upcoming(mk("past", Some("2026-04-10")), today, window).is_none());
        assert!(to_upcoming(mk("far", Some("2026-06-01")), today, window).is_none());
        assert!(to_upcoming(mk("none", None), today, window).is_none());
        assert!(to_upcoming(mk("next", Some("2026-04-25")), today, window).is_some());
        // A tournament dated today has either already finished or is in
        // progress — it is no longer "upcoming".
        assert!(to_upcoming(mk("today", Some("2026-04-17")), today, window).is_none());
        assert!(to_upcoming(mk("tomorrow", Some("2026-04-18")), today, window).is_some());
    }
}
