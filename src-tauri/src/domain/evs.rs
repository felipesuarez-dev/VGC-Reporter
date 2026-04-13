use serde::{Deserialize, Serialize};
use ts_rs::TS;

pub const EV_MAX_PER_STAT: u16 = 252;
pub const EV_MAX_TOTAL: u16 = 508;

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct EvSpread {
    pub hp: u16,
    pub atk: u16,
    pub def: u16,
    pub spa: u16,
    pub spd: u16,
    pub spe: u16,
}

impl EvSpread {
    pub fn total(&self) -> u16 {
        self.hp + self.atk + self.def + self.spa + self.spd + self.spe
    }

    pub fn is_valid(&self) -> bool {
        self.hp <= EV_MAX_PER_STAT
            && self.atk <= EV_MAX_PER_STAT
            && self.def <= EV_MAX_PER_STAT
            && self.spa <= EV_MAX_PER_STAT
            && self.spd <= EV_MAX_PER_STAT
            && self.spe <= EV_MAX_PER_STAT
            && self.total() <= EV_MAX_TOTAL
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_is_valid() {
        assert!(EvSpread::default().is_valid());
    }

    #[test]
    fn max_spread_is_valid() {
        let s = EvSpread {
            hp: 252,
            def: 252,
            spe: 4,
            ..Default::default()
        };
        assert_eq!(s.total(), 508);
        assert!(s.is_valid());
    }

    #[test]
    fn over_total_is_invalid() {
        let s = EvSpread {
            hp: 252,
            atk: 252,
            def: 252,
            ..Default::default()
        };
        assert!(!s.is_valid());
    }

    #[test]
    fn over_per_stat_is_invalid() {
        let s = EvSpread {
            hp: 253,
            ..Default::default()
        };
        assert!(!s.is_valid());
    }
}
