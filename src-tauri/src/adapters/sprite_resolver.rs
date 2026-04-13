use crate::config;

/// Build the primary Showdown gen5 pixel sprite URL from a species name.
/// Showdown sprites use lowercase slugs with no spaces or punctuation; the
/// same slug also covers form variants (e.g. `charizardmegax`).
pub fn primary_sprite_url(species: &str) -> String {
    format!("{}/{}.png", config::SHOWDOWN_SPRITES, slugify(species))
}

/// Variant-aware HD render fallback served from the same Showdown host.
/// Returns `None` only for empty inputs — callers should treat the URL as
/// "best effort" and fall back to hiding the image if both URLs 404.
pub fn fallback_sprite_url(species: &str) -> Option<String> {
    let slug = slugify(species);
    if slug.is_empty() {
        return None;
    }
    Some(format!(
        "https://play.pokemonshowdown.com/sprites/dex/{}.png",
        slug
    ))
}

pub fn canonical_id(species: &str) -> String {
    slugify(species)
}

/// Backwards-compatible alias for the primary sprite URL. Prefer
/// `primary_sprite_url` in new code.
pub fn sprite_url(species: &str) -> String {
    primary_sprite_url(species)
}

fn slugify(species: &str) -> String {
    species
        .to_lowercase()
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
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
    fn variant_slugs() {
        assert!(primary_sprite_url("Charizard-Mega-X").ends_with("/charizardmegax.png"));
        assert!(primary_sprite_url("Urshifu-Rapid-Strike").ends_with("/urshifurapidstrike.png"));
        assert!(primary_sprite_url("Tauros-Paldea-Combat").ends_with("/taurospaldeacombat.png"));
        assert!(primary_sprite_url("Type: Null").ends_with("/typenull.png"));
        assert!(primary_sprite_url("Ho-Oh").ends_with("/hooh.png"));
        assert!(primary_sprite_url("Farfetch'd").ends_with("/farfetchd.png"));
    }

    #[test]
    fn fallback_uses_dex_host() {
        let url = fallback_sprite_url("Charizard-Mega-X").unwrap();
        assert_eq!(
            url,
            "https://play.pokemonshowdown.com/sprites/dex/charizardmegax.png"
        );
    }

    #[test]
    fn fallback_empty_input_is_none() {
        assert!(fallback_sprite_url("").is_none());
        assert!(fallback_sprite_url("   ").is_none());
    }
}
