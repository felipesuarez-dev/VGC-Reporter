use crate::config;

/// Build the primary Showdown gen5 pixel sprite URL from a species display
/// name. Forms such as "Absol-Mega" and "Charizard-Mega-X" map to
/// `absol-mega.png` and `charizard-megax.png` — i.e. the Showdown CDN keeps
/// one hyphen between the base and the id'd forme. Single-name species
/// (Ho-Oh, Farfetch'd) collapse to `hooh`, `farfetchd`.
///
/// Known inverted / concatenated forms (Wash-Rotom, Kommo-o-Totem, Tatsugiri
/// variants, Greninja-Bond, Floette-Mega) are normalized first so the CDN
/// actually resolves.
pub fn primary_sprite_url(species: &str) -> String {
    format!("{}/{}.png", config::SHOWDOWN_SPRITES, primary_slug(species))
}

/// HD render fallback on the `sprites/dex` host, built from the concatenated
/// slug so that species with embedded hyphens (Ho-Oh → `hooh`) still resolve.
/// Returns `None` only for empty inputs.
pub fn fallback_sprite_url(species: &str) -> Option<String> {
    let slug = fallback_slug(species);
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
    to_id(&apply_alias(species))
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
        Some(f) if !f.is_empty() => primary_slug(&format!("{}-{}", base, f)),
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
    let combined = match forme {
        Some(f) if !f.is_empty() => format!("{}-{}", base, f),
        _ => base.to_string(),
    };
    let slug = fallback_slug(&combined);
    if slug.is_empty() {
        return None;
    }
    Some(format!(
        "https://play.pokemonshowdown.com/sprites/dex/{}.png",
        slug
    ))
}

/// Slug used for the gen5 hyphenated CDN. Handles alias rewrites and the
/// handful of forms whose sprite id is fully concatenated on that CDN
/// (totems, Tatsugiri cosmetic variants).
fn primary_slug(species: &str) -> String {
    let canonical = apply_alias(species);
    if needs_concatenated_primary(&canonical) {
        return to_id(&canonical);
    }
    hyphened_slug(&canonical)
}

/// Slug used for the dex/ HD fallback. Always concatenated; alias rewrites
/// still apply so Wash-Rotom → rotomwash there too.
fn fallback_slug(species: &str) -> String {
    let canonical = apply_alias(species);
    to_id(&canonical)
}

/// Rewrite community-used display names to Showdown's canonical forme so
/// sprite resolution doesn't miss. Returns the original string when no alias
/// applies.
fn apply_alias(species: &str) -> String {
    let trimmed = species.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    let lower = trimmed.to_ascii_lowercase();

    // Inverted Rotom forms: "Wash-Rotom" → "Rotom-Wash".
    for form in ["wash", "heat", "frost", "fan", "mow"] {
        if lower == format!("{}-rotom", form) {
            let mut chars = form.chars();
            let first = chars.next().unwrap().to_ascii_uppercase();
            return format!("Rotom-{}{}", first, chars.as_str());
        }
    }

    match lower.as_str() {
        "greninja-bond" | "ash-greninja" => "Greninja-Ash".to_string(),
        "floette-mega" => "Floette-Eternal".to_string(),
        _ => trimmed.to_string(),
    }
}

/// True for forms whose gen5 sprite lives at the concatenated id rather than
/// the usual `base-forme` hyphenated slug.
fn needs_concatenated_primary(species: &str) -> bool {
    let lower = species.to_ascii_lowercase();
    lower.ends_with("-totem") || lower.starts_with("tatsugiri-")
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

    #[test]
    fn rotom_forms_flipped_to_canonical() {
        // Community data sometimes stores the appliance before the base species.
        // We rewrite to Showdown's canonical "Rotom-Wash" order so the CDN hits.
        assert!(primary_sprite_url("Wash-Rotom").ends_with("/rotom-wash.png"));
        assert!(primary_sprite_url("Heat-Rotom").ends_with("/rotom-heat.png"));
        assert!(primary_sprite_url("Frost-Rotom").ends_with("/rotom-frost.png"));
        assert!(primary_sprite_url("Fan-Rotom").ends_with("/rotom-fan.png"));
        assert!(primary_sprite_url("Mow-Rotom").ends_with("/rotom-mow.png"));

        // Already-canonical order keeps working unchanged.
        assert!(primary_sprite_url("Rotom-Wash").ends_with("/rotom-wash.png"));

        // Fallback also rewrites the alias so it doesn't land on a 404.
        assert_eq!(
            fallback_sprite_url("Wash-Rotom").unwrap(),
            "https://play.pokemonshowdown.com/sprites/dex/rotomwash.png"
        );

        assert_eq!(canonical_id("Wash-Rotom"), "rotomwash");
    }

    #[test]
    fn totems_use_concatenated_slug() {
        assert!(primary_sprite_url("Kommo-o-Totem").ends_with("/kommoototem.png"));
        assert!(primary_sprite_url("Marowak-Alola-Totem").ends_with("/marowakalolatotem.png"));
        assert!(primary_sprite_url("Raticate-Alola-Totem").ends_with("/raticatealolatotem.png"));
        assert!(primary_sprite_url("Mimikyu-Busted-Totem").ends_with("/mimikyubustedtotem.png"));
        assert!(primary_sprite_url("Mimikyu-Totem").ends_with("/mimikyutotem.png"));
        assert!(primary_sprite_url("Gumshoos-Totem").ends_with("/gumshoostotem.png"));
        assert!(primary_sprite_url("Lurantis-Totem").ends_with("/lurantistotem.png"));
        assert!(primary_sprite_url("Salazzle-Totem").ends_with("/salazzletotem.png"));
        assert!(primary_sprite_url("Togedemaru-Totem").ends_with("/togedemarutotem.png"));
        assert!(primary_sprite_url("Araquanid-Totem").ends_with("/araquanidtotem.png"));

        assert_eq!(
            fallback_sprite_url("Kommo-o-Totem").unwrap(),
            "https://play.pokemonshowdown.com/sprites/dex/kommoototem.png"
        );
    }

    #[test]
    fn ash_greninja_aliases() {
        // Both community variants normalize to Showdown's Greninja-Ash.
        assert!(primary_sprite_url("Greninja-Bond").ends_with("/greninja-ash.png"));
        assert!(primary_sprite_url("Ash-Greninja").ends_with("/greninja-ash.png"));
        assert_eq!(canonical_id("Greninja-Bond"), "greninjaash");
    }

    #[test]
    fn floette_mega_is_eternal() {
        // Floette's only special forme is Eternal; "Mega" is a misnamed alias.
        assert!(primary_sprite_url("Floette-Mega").ends_with("/floette-eternal.png"));
        assert!(primary_sprite_url("Floette-Eternal").ends_with("/floette-eternal.png"));
    }

    #[test]
    fn tatsugiri_variants_concatenated() {
        assert!(primary_sprite_url("Tatsugiri-Droopy").ends_with("/tatsugiridroopy.png"));
        assert!(primary_sprite_url("Tatsugiri-Curly").ends_with("/tatsugiricurly.png"));
        assert!(primary_sprite_url("Tatsugiri-Stretchy").ends_with("/tatsugiristretchy.png"));
    }
}
