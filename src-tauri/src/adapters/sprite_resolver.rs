use crate::config;

/// Build the primary Showdown gen5 pixel sprite URL from a species display
/// name. Forms such as "Absol-Mega" and "Charizard-Mega-X" map to
/// `absol-mega.png` and `charizard-megax.png` — i.e. the Showdown CDN keeps
/// one hyphen between the base and the id'd forme. Single-name species
/// (Ho-Oh, Farfetch'd) collapse to `hooh`, `farfetchd`.
pub fn primary_sprite_url(species: &str) -> String {
    format!("{}/{}.png", config::SHOWDOWN_SPRITES, hyphened_slug(species))
}

/// HD render fallback on the `sprites/dex` host, built from the concatenated
/// slug so that species with embedded hyphens (Ho-Oh → `hooh`) still resolve.
/// Returns `None` only for empty inputs.
pub fn fallback_sprite_url(species: &str) -> Option<String> {
    let slug = to_id(species);
    if slug.is_empty() {
        return None;
    }
    Some(format!(
        "https://play.pokemonshowdown.com/sprites/dex/{}.png",
        slug
    ))
}

/// Canonical Showdown id — alphanumeric only, lowercase, no hyphens. Matches
/// the key format in `pokedex.json`.
pub fn canonical_id(species: &str) -> String {
    to_id(species)
}

/// Backwards-compatible alias for the primary sprite URL.
pub fn sprite_url(species: &str) -> String {
    primary_sprite_url(species)
}

/// Build the Showdown sprite slug from a pre-split base + forme pair. Prefer
/// this when the caller already has the split (e.g. parsed from
/// `pokedex.json`), because display-name heuristics can't tell "Ho-Oh" (the
/// base species) apart from "Absol-Mega" (a forme).
pub fn sprite_slug_parts(base: &str, forme: Option<&str>) -> String {
    match forme {
        Some(f) if !f.is_empty() => format!("{}-{}", to_id(base), to_id(f)),
        _ => to_id(base),
    }
}

/// Build the gen5 sprite URL directly from a pre-split base + forme pair.
pub fn primary_sprite_url_parts(base: &str, forme: Option<&str>) -> String {
    format!(
        "{}/{}.png",
        config::SHOWDOWN_SPRITES,
        sprite_slug_parts(base, forme)
    )
}

/// Dex-host fallback for callers that already have a base/forme split. Uses
/// the concatenated form so it mirrors what the generic display-name fallback
/// produces.
pub fn fallback_sprite_url_parts(base: &str, forme: Option<&str>) -> Option<String> {
    let concatenated = format!("{}{}", to_id(base), forme.map(to_id).unwrap_or_default());
    if concatenated.is_empty() {
        return None;
    }
    Some(format!(
        "https://play.pokemonshowdown.com/sprites/dex/{}.png",
        concatenated
    ))
}

/// Hyphened display-name slug used by the primary CDN. Splits on the first
/// hyphen so multi-word forms stay together in a single segment (e.g.
/// "Charizard-Mega-X" → `charizard-megax`). Single-name species that happen
/// to carry a hyphen (Ho-Oh) turn into `ho-oh` here but are rescued by the
/// concatenated `dex/` fallback.
fn hyphened_slug(species: &str) -> String {
    if let Some((base, forme)) = species.split_once('-') {
        let forme_id = to_id(forme);
        let base_id = to_id(base);
        if forme_id.is_empty() {
            return base_id;
        }
        if base_id.is_empty() {
            return forme_id;
        }
        return format!("{}-{}", base_id, forme_id);
    }
    to_id(species)
}

/// Showdown's `toID`: lowercase, strip everything that isn't `[a-z0-9]`.
fn to_id(text: &str) -> String {
    text.chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .map(|c| c.to_ascii_lowercase())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn basic_sprite_url() {
        assert!(primary_sprite_url("Incineroar").ends_with("/incineroar.png"));
    }

    #[test]
    fn handles_punctuation() {
        assert!(primary_sprite_url("Mr. Rime").ends_with("/mrrime.png"));
    }

    #[test]
    fn forme_slugs_use_single_hyphen() {
        // Showdown CDN keeps one hyphen between the base id and the forme id.
        assert!(primary_sprite_url("Absol-Mega").ends_with("/absol-mega.png"));
        assert!(primary_sprite_url("Charizard-Mega-X").ends_with("/charizard-megax.png"));
        assert!(primary_sprite_url("Urshifu-Rapid-Strike").ends_with("/urshifu-rapidstrike.png"));
        assert!(primary_sprite_url("Tauros-Paldea-Combat").ends_with("/tauros-paldeacombat.png"));
        assert!(primary_sprite_url("Castform-Sunny").ends_with("/castform-sunny.png"));
        assert!(primary_sprite_url("Type: Null").ends_with("/typenull.png"));
        assert!(primary_sprite_url("Farfetch'd").ends_with("/farfetchd.png"));
    }

    #[test]
    fn sprite_slug_parts_matches_base_forme() {
        assert_eq!(sprite_slug_parts("Absol", Some("Mega")), "absol-mega");
        assert_eq!(
            sprite_slug_parts("Charizard", Some("Mega-X")),
            "charizard-megax"
        );
        assert_eq!(sprite_slug_parts("Ho-Oh", None), "hooh");
        assert_eq!(sprite_slug_parts("Incineroar", None), "incineroar");
    }

    #[test]
    fn fallback_uses_concatenated_slug() {
        // Concatenated on dex/ rescues single-name species with embedded
        // hyphens like Ho-Oh (which would be `ho-oh.png` via the primary).
        let url = fallback_sprite_url("Ho-Oh").unwrap();
        assert_eq!(url, "https://play.pokemonshowdown.com/sprites/dex/hooh.png");

        let url = fallback_sprite_url("Charizard-Mega-X").unwrap();
        assert_eq!(
            url,
            "https://play.pokemonshowdown.com/sprites/dex/charizardmegax.png"
        );
    }

    #[test]
    fn fallback_parts_mirrors_concatenated() {
        assert_eq!(
            fallback_sprite_url_parts("Absol", Some("Mega")),
            Some("https://play.pokemonshowdown.com/sprites/dex/absolmega.png".into())
        );
    }

    #[test]
    fn fallback_empty_input_is_none() {
        assert!(fallback_sprite_url("").is_none());
        assert!(fallback_sprite_url("   ").is_none());
    }
}
