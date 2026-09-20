//! Species that Regulation M-C adds on top of Regulation M-B.
//!
//! M-C is purely additive (nothing legal in M-B was removed), so this file only
//! holds the **delta**: 24 new base species + 6 new Mega Evolutions = 30
//! entries. `RegMcRules` unions this with `ALLOWED_SPECIES_MA` and
//! `ALLOWED_SPECIES_MB_NEW` at build time.
//!
//! Regional / gendered formes are NOT listed: `super::reg_mc::RegMcRules::matches`
//! collapses a dashed forme to its base species, so `Indeedee-F`,
//! `Persian-Alola` and `Toxtricity-Low-Key` are covered by their bases.
//! Mega forms cannot collapse (the `has_forbidden_form_token` guard rejects any
//! `-Mega*` suffix), so each one needs an explicit entry — including the three
//! new `-Mega-Z` forms, which M-B explicitly banned.
//!
//! Derivation (two independent sources agreeing, zero diff): the official
//! announcement's "24 Pokémon and six Mega Evolutions", cross-checked against
//! champteams.gg `/api/default-sets` (338 curated M-C sets) diffed against the
//! M-A + M-B lists using this crate's own `matches` semantics. Both produced
//! exactly these 30 entries. Showdown's `pokedex.json` confirms every name.
//!
//! Note: champteams spells Mega Meowstic `Meowstic-M-Mega`; that is the male
//! forme of `Meowstic-Mega`, already legal in M-B, not a seventh new Mega.

pub const ALLOWED_SPECIES_MC_NEW: &[&str] = &[
    // --- 24 new base species (vs M-B) ---
    "Arboliva",
    "Baxcalibur",
    "Cinderace",
    "Farfetch'd",
    "Gogoat",
    "Golisopod",
    "Grapploct",
    "Indeedee",
    "Inteleon",
    "Mabosstiff",
    "Mr. Mime",
    "Pawmot",
    "Perrserker",
    "Persian",
    "Pincurchin",
    "Rillaboom",
    "Salamence",
    "Sirfetch'd",
    "Squawkabilly",
    "Swalot",
    "Thievul",
    "Toxtricity",
    "Watchog",
    "Wigglytuff",
    // --- 6 new Mega Evolutions ---
    // The three Z forms are the first "Z Mega Evolutions" in Champions and were
    // banned in M-B, so they must be listed explicitly rather than inherited.
    "Absol-Mega-Z",
    "Baxcalibur-Mega",
    "Garchomp-Mega-Z",
    "Golisopod-Mega",
    "Lucario-Mega-Z",
    "Salamence-Mega",
];
