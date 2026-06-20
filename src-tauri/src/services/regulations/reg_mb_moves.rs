//! Moves that Regulation M-B adds on top of Regulation M-A.
//!
//! M-A's 467-move list was curated for M-A's species. M-B's 22 new species bring
//! a handful of moves not already covered — signature moves plus a few common
//! ones the M-A roster never used. `RegMbRules` unions this delta with
//! `ALLOWED_MOVES_MA` at build time. Verified absent from `ALLOWED_MOVES_MA`.

pub const ALLOWED_MOVES_MB_NEW: &[&str] = &[
    "Aqua Jet",
    "Barb Barrage", // Overqwil
    "Bullet Punch",
    "Dazzling Gleam",
    "Hyper Voice",
    "Make It Rain", // Gholdengo
    "Megahorn",
    "Power Gem",
    "Rage Fist",    // Annihilape
    "Spirit Break", // Grimmsnarl
];
