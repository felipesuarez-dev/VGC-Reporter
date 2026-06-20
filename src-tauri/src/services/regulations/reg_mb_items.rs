//! Held items that Regulation M-B adds on top of Regulation M-A.
//!
//! M-A already shipped the classic Mega Stones. M-B introduces 16 new Mega
//! Evolutions, so only their 16 new Mega Stones need to be added — every other
//! M-B item is already in `ALLOWED_ITEMS_MA`. `RegMbRules` unions this delta
//! with the M-A list at build time.
//!
//! EN names verified against game8 + Bulbapedia. Several are clipped forms that
//! are easy to get wrong (a typo silently bans a legal item):
//!   - `Staraptite`  (NOT "Staraptorite")
//!   - `Scolipite`   (NOT "Scolipedite")
//!   - `Scraftinite` (NOT "Scraftyite")
//!   - `Barbaracite` (NOT "Barbaraclite")
//!   - `Raichunite X` / `Raichunite Y` (NOT "Raichuite")
//!
//! Mega Dragonite's stone (`Dragoninite`) is already in M-A, so it is omitted.

pub const ALLOWED_ITEMS_MB_NEW: &[&str] = &[
    "Barbaracite",
    "Blazikenite",
    "Dragalgite",
    "Eelektrossite",
    "Falinksite",
    "Malamarite",
    "Mawilite",
    "Metagrossite",
    "Pyroarite",
    "Raichunite X",
    "Raichunite Y",
    "Sceptilite",
    "Scolipite",
    "Scraftinite",
    "Staraptite",
    "Swampertite",
];
