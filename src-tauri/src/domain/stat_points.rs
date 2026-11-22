use crate::domain::evs::EvSpread;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

pub const SP_MAX_PER_STAT: u16 = 32;
pub const SP_MAX_TOTAL: u16 = 66;

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct StatPointSpread {
    pub hp: u16,
    pub atk: u16,
    pub def: u16,
    pub spa: u16,
    pub spd: u16,
    pub spe: u16,
}

impl StatPointSpread {
    pub fn total(&self) -> u16 {
        self.hp + self.atk + self.def + self.spa + self.spd + self.spe
    }

    pub fn is_valid(&self) -> bool {
        self.hp <= SP_MAX_PER_STAT
            && self.atk <= SP_MAX_PER_STAT
            && self.def <= SP_MAX_PER_STAT
            && self.spa <= SP_MAX_PER_STAT
            && self.spd <= SP_MAX_PER_STAT
            && self.spe <= SP_MAX_PER_STAT
            && self.total() <= SP_MAX_TOTAL
    }

    /// Repair an imported/legacy spread without losing the user's intent:
    /// trim the largest investment one point at a time until the 66 cap fits.
    pub fn normalized(mut self) -> Self {
        for value in [
            &mut self.hp,
            &mut self.atk,
            &mut self.def,
            &mut self.spa,
            &mut self.spd,
            &mut self.spe,
        ] {
            *value = (*value).min(SP_MAX_PER_STAT);
        }
        while self.total() > SP_MAX_TOTAL {
            let mut largest = 0u16;
            let mut largest_value = 0u16;
            for (index, value) in [self.hp, self.atk, self.def, self.spa, self.spd, self.spe]
                .into_iter()
                .enumerate()
            {
                if value > largest_value {
                    largest = index as u16;
                    largest_value = value;
                }
            }
            match largest {
                0 => self.hp -= 1,
                1 => self.atk -= 1,
                2 => self.def -= 1,
                3 => self.spa -= 1,
                4 => self.spd -= 1,
                _ => self.spe -= 1,
            }
        }
        self
    }
}

/// Pokémon HOME conversion: 4 EVs buy the first SP, then 8 EVs per SP.
pub fn sp_from_ev(ev: u16) -> u16 {
    if ev < 4 {
        0
    } else {
        (1 + (ev - 4) / 8).min(SP_MAX_PER_STAT)
    }
}

/// Inverse conversion used when the user switches back to Classic.
pub fn ev_from_sp(sp: u16) -> u16 {
    match sp {
        0 => 0,
        1 => 4,
        value => (4 + (value.saturating_sub(1)) * 8).min(252),
    }
}

pub fn evs_to_stat_points(evs: &EvSpread) -> StatPointSpread {
    StatPointSpread {
        hp: sp_from_ev(evs.hp),
        atk: sp_from_ev(evs.atk),
        def: sp_from_ev(evs.def),
        spa: sp_from_ev(evs.spa),
        spd: sp_from_ev(evs.spd),
        spe: sp_from_ev(evs.spe),
    }
    .normalized()
}

pub fn stat_points_to_evs(points: &StatPointSpread) -> EvSpread {
    let mut evs = EvSpread {
        hp: ev_from_sp(points.hp),
        atk: ev_from_sp(points.atk),
        def: ev_from_sp(points.def),
        spa: ev_from_sp(points.spa),
        spd: ev_from_sp(points.spd),
        spe: ev_from_sp(points.spe),
    };
    // 32/32/2 maps to 252/252/12 = 516 EVs. Trim the smallest investment in
    // 4-EV steps until the Classic 508 cap is respected; the two main stats
    // stay maxed and the spread remains legal.
    while evs.total() > 508 {
        let mut smallest = 0usize;
        let mut smallest_value = u16::MAX;
        for (index, value) in [evs.hp, evs.atk, evs.def, evs.spa, evs.spd, evs.spe]
            .into_iter()
            .enumerate()
        {
            if value > 0 && value < smallest_value {
                smallest = index;
                smallest_value = value;
            }
        }
        let trim = smallest_value.min(4);
        match smallest {
            0 => evs.hp = evs.hp.saturating_sub(trim),
            1 => evs.atk = evs.atk.saturating_sub(trim),
            2 => evs.def = evs.def.saturating_sub(trim),
            3 => evs.spa = evs.spa.saturating_sub(trim),
            4 => evs.spd = evs.spd.saturating_sub(trim),
            _ => evs.spe = evs.spe.saturating_sub(trim),
        }
    }
    evs
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn home_conversion_matches_the_documented_values() {
        assert_eq!(sp_from_ev(0), 0);
        assert_eq!(sp_from_ev(3), 0);
        assert_eq!(sp_from_ev(4), 1);
        assert_eq!(sp_from_ev(12), 2);
        assert_eq!(sp_from_ev(252), 32);
        assert_eq!(ev_from_sp(0), 0);
        assert_eq!(ev_from_sp(1), 4);
        assert_eq!(ev_from_sp(2), 12);
        assert_eq!(ev_from_sp(32), 252);
    }

    #[test]
    fn classic_252_252_4_becomes_a_legal_champions_spread() {
        let evs = EvSpread {
            hp: 252,
            atk: 252,
            def: 0,
            spa: 0,
            spd: 0,
            spe: 4,
        };
        let sp = evs_to_stat_points(&evs);
        assert!(sp.is_valid(), "{sp:?}");
        assert_eq!(sp.total(), 65);
        assert_eq!(sp.hp, 32);
        assert_eq!(sp.atk, 32);
        assert_eq!(sp.spe, 1);
    }

    #[test]
    fn champions_32_32_2_returns_a_legal_508_spread() {
        let sp = StatPointSpread {
            hp: 32,
            atk: 32,
            spe: 2,
            ..Default::default()
        };
        let evs = stat_points_to_evs(&sp);
        assert!(evs.is_valid(), "{evs:?}");
        assert_eq!(evs.hp, 252);
        assert_eq!(evs.atk, 252);
        assert!(evs.total() <= 508);
    }

    #[test]
    fn invalid_spreads_are_trimmed_to_the_cap() {
        let sp = StatPointSpread {
            hp: 32,
            atk: 32,
            def: 32,
            ..Default::default()
        };
        let normalized = sp.normalized();
        assert!(normalized.is_valid());
        assert_eq!(normalized.total(), 66);
    }
}
