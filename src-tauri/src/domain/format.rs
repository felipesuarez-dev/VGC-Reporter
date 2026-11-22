use crate::domain::regulation;
use chrono::Datelike;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Stable internal regulation ID (`regulation-m-c`, `regulation-m-d`, …).
///
/// The type is a string newtype rather than an enum so a regulation
/// discovered from the official calendar at runtime does not require a new
/// binary. Static M-A/M-B/M-C keep their verified metadata below; dynamic IDs
/// read it from [`crate::domain::regulation`].
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[serde(transparent)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct Format(String);

impl Format {
    pub fn new(id: impl Into<String>) -> Self {
        Self(id.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Historical name used by cache keys. Kept as an alias so existing cache
    /// values stay valid.
    pub fn cache_id(&self) -> &str {
        self.as_str()
    }

    pub fn ma() -> Self {
        Self::new("regulation-m-a")
    }
    pub fn mb() -> Self {
        Self::new("regulation-m-b")
    }
    pub fn mc() -> Self {
        Self::new("regulation-m-c")
    }
    pub fn md() -> Self {
        Self::new("regulation-m-d")
    }
    pub fn regulation_i() -> Self {
        Self::new("regulation-i")
    }

    pub fn is_static(&self) -> bool {
        matches!(
            self.as_str(),
            "regulation-m-a" | "regulation-m-b" | "regulation-m-c" | "regulation-i"
        )
    }

    /// Regulation code as published upstream (`M-A`, `M-B`, …).
    pub fn code(&self) -> String {
        if let Some(snap) = regulation::snapshot(self.as_str()) {
            return snap.info.code;
        }
        match self.as_str() {
            "regulation-m-a" => "M-A".into(),
            "regulation-m-b" => "M-B".into(),
            "regulation-m-c" => "M-C".into(),
            "regulation-m-d" => "M-D".into(),
            "regulation-i" => "I".into(),
            other => other
                .strip_prefix("regulation-")
                .map(|s| s.to_ascii_uppercase())
                .unwrap_or_else(|| other.to_ascii_uppercase()),
        }
    }

    /// Codes verified against the live Limitless API: VGC uses `M-A` and the
    /// SV Reg I format reports as `SVI` — not `M2A` / `I` like older guesses.
    pub fn limitless_code(&self) -> Option<String> {
        if let Some(snap) = regulation::snapshot(self.as_str()) {
            return snap.limitless_code;
        }
        match self.as_str() {
            "regulation-m-c" => Some("M-C".into()),
            "regulation-m-b" => Some("M-B".into()),
            "regulation-m-a" => Some("M-A".into()),
            "regulation-i" => Some("SVI".into()),
            _ => Some(self.code()),
        }
    }

    /// Smogon publishes the Champions ladders under a `gen9champions…` prefix,
    /// NOT the `gen9vgc…` one used by the mainline VGC ladders.
    pub fn default_smogon_slug(&self) -> Option<String> {
        if let Some(snap) = regulation::snapshot(self.as_str()) {
            return snap.smogon_slug;
        }
        match self.as_str() {
            "regulation-m-c" => Some("gen9championsvgc2026regmc".into()),
            "regulation-m-b" => Some("gen9championsvgc2026regmb".into()),
            "regulation-m-a" => Some("gen9championsvgc2026regma".into()),
            "regulation-i" => Some("gen9vgc2026regi".into()),
            _ => {
                let code = self.code().to_ascii_lowercase().replace('-', "");
                let year = self
                    .data_window()
                    .map(|(start, _)| start.year())
                    .unwrap_or_else(|| chrono::Utc::now().year());
                Some(format!("gen9championsvgc{year}reg{code}"))
            }
        }
    }

    /// Labmaus regulation string used in the `?regulation=` query param.
    /// Runtime override: `labmaus_name::<cache_id>` in SettingsRepo. A new
    /// regulation can be onboarded by seeding one settings row before its
    /// static default ships.
    pub fn default_labmaus_name(&self) -> Option<String> {
        if let Some(snap) = regulation::snapshot(self.as_str()) {
            return snap.labmaus_name;
        }
        match self.as_str() {
            "regulation-m-c" => Some("Regulation Set M-C".into()),
            "regulation-m-b" => Some("Regulation Set M-B".into()),
            "regulation-m-a" => Some("Regulation Set M-A".into()),
            "regulation-i" => None,
            _ => Some(format!("Regulation Set {}", self.code())),
        }
    }

    /// Inclusive date range of competitive data that belongs to this
    /// regulation. `end == None` means "ongoing"; callers clamp it to today.
    pub fn data_window(&self) -> Option<(chrono::NaiveDate, Option<chrono::NaiveDate>)> {
        if let Some(snap) = regulation::snapshot(self.as_str()) {
            let parse = |s: &str| chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").ok();
            let start = snap.data_start.as_deref().and_then(parse);
            let end = snap.data_end.as_deref().and_then(parse);
            if let Some(start) = start {
                return Some((start, end));
            }
        }
        let d = |y, m, day| chrono::NaiveDate::from_ymd_opt(y, m, day).expect("valid date");
        match self.as_str() {
            "regulation-m-c" => Some((d(2026, 9, 9), Some(d(2026, 12, 1)))),
            "regulation-m-b" => Some((d(2026, 6, 17), Some(d(2026, 9, 8)))),
            "regulation-m-a" => Some((d(2026, 6, 3), Some(d(2026, 6, 16)))),
            "regulation-i" => None,
            _ => None,
        }
    }

    /// Default data window for the Dashboard: the season containing `at`, or
    /// the latest started season for an archived regulation. Falls back to the
    /// regulation's own calendar when the catalog has no seasons yet.
    pub fn default_data_range(
        &self,
        at: chrono::DateTime<chrono::Utc>,
    ) -> Option<(chrono::NaiveDate, chrono::NaiveDate)> {
        let snap = regulation::snapshot(self.as_str())?;
        regulation::season_for_at(&snap.info.seasons, at).and_then(|season| season.data_window())
    }

    /// Rating cutoffs to probe in order (high → low). VGC doubles ladder tiers.
    pub fn rating_ladder(&self) -> &'static [u32] {
        &[1760, 1630, 1500, 0]
    }

    /// Closed formats pin a specific month; active formats return `None` and
    /// rewind from the current month.
    pub fn anchor_month(&self) -> Option<(i32, u32)> {
        None
    }

    pub fn label(&self) -> String {
        if let Some(snap) = regulation::snapshot(self.as_str()) {
            return snap.info.label;
        }
        match self.as_str() {
            "regulation-m-a" => "Regulation M-A".into(),
            "regulation-m-b" => "Regulation M-B".into(),
            "regulation-m-c" => "Regulation M-C".into(),
            "regulation-m-d" => "Regulation M-D".into(),
            "regulation-i" => "Regulation I".into(),
            _ => format!("Regulation {}", self.code()),
        }
    }

    /// All selectable IDs: the static Champions archive plus every dynamic
    /// regulation discovered at runtime.
    pub fn all_active() -> Vec<Format> {
        let mut out = vec![
            Format::mc(),
            Format::mb(),
            Format::ma(),
            Format::regulation_i(),
        ];
        for snap in regulation::snapshots() {
            let f = Format::new(snap.info.id);
            if !out.contains(&f) {
                out.push(f);
            }
        }
        out
    }
}

impl std::fmt::Display for Format {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.label())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn cache_ids_are_unique() {
        let all = Format::all_active();
        let ids: HashSet<&str> = all.iter().map(|f| f.cache_id()).collect();
        assert_eq!(ids.len(), all.len());
    }

    #[test]
    fn rating_ladder_descends() {
        for f in Format::all_active() {
            let ladder = f.rating_ladder();
            for w in ladder.windows(2) {
                assert!(w[0] >= w[1], "ladder not descending for {:?}", f);
            }
        }
    }

    /// Guards the bug that kept the Smogon fallback dead for every Champions
    /// set: those ladders live under `gen9champions…`, never `gen9vgc2026reg…`.
    #[test]
    fn champions_smogon_slugs_use_the_champions_prefix() {
        for f in [Format::mc(), Format::mb(), Format::ma()] {
            assert!(
                f.default_smogon_slug()
                    .expect("static Champions slug")
                    .starts_with("gen9champions"),
                "{:?} must use the gen9champions prefix",
                f
            );
        }
    }

    #[test]
    fn champions_labmaus_names_are_distinct() {
        let names: HashSet<String> = [Format::mc(), Format::mb(), Format::ma()]
            .iter()
            .filter_map(|f| f.default_labmaus_name())
            .collect();
        assert_eq!(names.len(), 3, "labmaus labels must not be shared");
    }

    #[test]
    fn champions_windows_are_disjoint_and_ordered() {
        let (_, mb_end) = Format::mb().data_window().unwrap();
        let (mc_start, mc_end) = Format::mc().data_window().unwrap();
        assert_eq!(mc_end, chrono::NaiveDate::from_ymd_opt(2026, 12, 1));
        assert!(
            mb_end.expect("M-B is closed") < mc_start,
            "M-B must close before M-C opens"
        );
    }

    #[test]
    fn dynamic_ids_derive_a_code_and_label() {
        let f = Format::new("regulation-m-e");
        assert_eq!(f.code(), "M-E");
        assert_eq!(f.label(), "Regulation M-E");
        assert_eq!(
            f.default_labmaus_name().as_deref(),
            Some("Regulation Set M-E")
        );
    }
}
