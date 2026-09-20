//! Held items that Regulation M-C adds on top of Regulation M-A + M-B.
//!
//! Two groups, kept apart because they have different provenance:
//!
//! 1. **The 6 Mega Stones** for M-C's new Mega Evolutions. Names verified in
//!    Showdown's `items.js` AND in champteams.gg's curated sets — both agree.
//!    Three are easy to get wrong (a typo silently bans a legal item):
//!      - `Baxcalibrite` (NOT "Baxcaliburite")
//!      - `Golisopite`   (NOT "Golisopodite" / "Golispite")
//!      - the Z stones carry a SPACE before the Z: `Absolite Z`.
//!
//! 2. **Items that were already legal but missing from the allow-list.** These
//!    are not M-C additions — `Life Orb` is the single most-used item in the
//!    M-B tournament data (31% of Kingambit sets), yet the allow-list had
//!    `Choice Scarf` without `Choice Band` and no `Life Orb` at all, so the
//!    Team Builder flagged perfectly legal teams as illegal. Found by diffing
//!    every item observed in real M-B/M-C competitive data against the list,
//!    then discarding anything Showdown's `items.js` does not recognise (that
//!    filter removed 11 upstream typos). They are grouped here rather than
//!    back-patched into `ALLOWED_ITEMS_MA` because the evidence is M-B/M-C
//!    tournament usage; M-A is a closed archive and its list is left untouched.
//!
//! Rocky Helmet and Air Balloon belong to BOTH groups — the official M-C
//! announcement names them as newly available — so they are listed under (1).

pub const ALLOWED_ITEMS_MC_NEW: &[&str] = &[
    // --- 1. New in Regulation M-C ---
    "Absolite Z",
    "Air Balloon",
    "Baxcalibrite",
    "Garchompite Z",
    "Golisopite",
    "Lucarionite Z",
    "Rocky Helmet",
    "Salamencite",
    // --- 2. Legal since earlier sets, absent from the allow-list ---
    "Big Root",
    "Binding Band",
    "Choice Band",
    "Damp Rock",
    "Eject Button",
    "Electric Seed",
    "Expert Belt",
    "Grassy Seed",
    "Heat Rock",
    "Icy Rock",
    "Iron Ball",
    "Leek",
    "Life Orb",
    "Light Clay",
    "Metronome",
    "Misty Seed",
    "Muscle Band",
    "Pixie Plate",
    "Psychic Seed",
    "Red Card",
    "Terrain Extender",
    "Throat Spray",
    "Wide Lens",
    "Wise Glasses",
    "Zoom Lens",
];
