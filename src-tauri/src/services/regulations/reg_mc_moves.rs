//! Moves that Regulation M-C adds on top of Regulation M-A + M-B.
//!
//! Two groups again. The signature moves come with M-C's 24 new species; the
//! rest were already legal but missing from the 477-move allow-list, which
//! means the Team Builder rejected them. `High Horsepower`, `Dragon Pulse`,
//! `Shadow Sneak` and `Extreme Speed` are all heavily used in the M-B
//! tournament data, so this is a live bug being fixed, not a new permission.
//!
//! Every entry was validated against Showdown's `moves.json` — all 26 resolve,
//! zero unrecognised names. `RegMcRules` unions this delta with
//! `ALLOWED_MOVES_MA` + `ALLOWED_MOVES_MB_NEW` at build time.

pub const ALLOWED_MOVES_MC_NEW: &[&str] = &[
    // --- Signature / roster moves of the new M-C species ---
    "Glaive Rush",    // Baxcalibur
    "Jaw Lock",       // Baxcalibur
    "Meteor Assault", // Sirfetch'd
    "No Retreat",     // Falinks / Sirfetch'd
    "Overdrive",      // Toxtricity
    "Pyro Ball",      // Cinderace
    "Snipe Shot",     // Inteleon
    // --- Already legal, missing from the allow-list ---
    "Accelerock",
    "Aqua Tail",
    "Boomburst",
    "Curse",
    "Dragon Claw",
    "Dragon Pulse",
    "Extreme Speed",
    "High Horsepower",
    "Hydro Pump",
    "Ice Shard",
    "Jet Punch",
    "Mach Punch",
    "Mega Kick",
    "Power Whip",
    "Quick Attack",
    "Seed Bomb",
    "Shadow Sneak",
    "Vacuum Wave",
    "X-Scissor",
];
