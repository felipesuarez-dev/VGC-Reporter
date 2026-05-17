use serde::{Deserialize, Serialize};
use ts_rs::TS;

pub const IV_MAX: u8 = 31;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct IvSpread {
    pub hp: u8,
    pub atk: u8,
    pub def: u8,
    pub spa: u8,
    pub spd: u8,
    pub spe: u8,
}

impl Default for IvSpread {
    fn default() -> Self {
        Self {
            hp: IV_MAX,
            atk: IV_MAX,
            def: IV_MAX,
            spa: IV_MAX,
            spd: IV_MAX,
            spe: IV_MAX,
        }
    }
}

impl IvSpread {
    pub fn is_valid(&self) -> bool {
        self.hp <= IV_MAX
            && self.atk <= IV_MAX
            && self.def <= IV_MAX
            && self.spa <= IV_MAX
            && self.spd <= IV_MAX
            && self.spe <= IV_MAX
    }

    pub fn is_default(&self) -> bool {
        self.hp == IV_MAX
            && self.atk == IV_MAX
            && self.def == IV_MAX
            && self.spa == IV_MAX
            && self.spd == IV_MAX
            && self.spe == IV_MAX
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_is_all_31() {
        let s = IvSpread::default();
        assert_eq!(s.hp, 31);
        assert!(s.is_default());
        assert!(s.is_valid());
    }

    #[test]
    fn over_max_invalid() {
        let s = IvSpread {
            hp: 32,
            ..Default::default()
        };
        assert!(!s.is_valid());
    }
}
