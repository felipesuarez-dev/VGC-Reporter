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

/// Display name after Showdown alias rewriting. "Wash-Rotom" → "Rotom-Wash",
/// "Ash-Greninja" → "Greninja-Ash", "Floette-Mega" → "Floette-Eternal", etc.
/// Used to normalize display strings coming from external APIs (Limitless)
/// so downstream consumers see a single canonical form.
pub fn canonical_display_name(species: &str) -> String {
    apply_alias(species)
}

/// Backwards-compatible alias for the primary sprite URL.
pub fn sprite_url(species: &str) -> String {
    primary_sprite_url(species)
}

/// PokéAPI Home render (512×512) for a national dex number. This is the most
/// reliable fallback for species whose Showdown slug has drifted or who lack a
/// sprite in the community CDN.
pub fn home_sprite_url(num: u32) -> Option<String> {
    if num == 0 {
        return None;
    }
    Some(format!(
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/{}.png",
        num
    ))
}

/// Build the Showdown sprite slug from a pre-split base + forme pair. Prefer
/// this when the caller already has the split (e.g. parsed from
/// `pokedex.json`), because display-name heuristics can't tell "Ho-Oh" (the
/// base species) apart from "Absol-Mega" (a forme).
pub fn sprite_slug_parts(base: &str, forme: Option<&str>) -> String {
    match forme {
        Some(f) if !f.is_empty() => primary_slug(&format!("{}-{}", base, f)),
        _ => {
            // Most species without a forme stay as a concatenated slug
            // (Ho-Oh → hooh, Farfetch'd → farfetchd). But when the alias layer
            // rewrites the bare name into a specific forme (e.g. AZ's
            // Floette → Floette-Eternal is the only competitively legal
            // Floette in M-A), the result needs hyphenation so the CDN
            // serves the right sprite (floette-eternal.png, not floetteeternal.png).
            let aliased = apply_alias(base);
            if aliased != base {
                primary_slug(&aliased)
            } else {
                to_id(base)
            }
        }
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

    // Regional-prefix formats ("Hisuian Typhlosion", "Alolan Ninetales",
    // "Paldean Tauros Aqua Breed"). Showdown keys them base-first with a
    // region suffix (typhlosion-hisui, ninetales-alola, tauros-paldeaaqua),
    // so rewrite before modifier-first / id normalization.
    if let Some(rewritten) = rewrite_regional_prefix(trimmed) {
        return rewritten;
    }

    // Modifier-first legacy formats: Labmaus/Pokepaste sometimes emit
    // "Mega Scizor", "Gigantamax Charizard", "Primal Groudon" (keyword
    // first). Showdown keys them base-first hyphenated, so rewrite here
    // before any id/slug normalization runs.
    if let Some(rewritten) = rewrite_modifier_first(trimmed) {
        return rewritten;
    }

    // Inverted Rotom forms: hyphenated ("Wash-Rotom") and concatenated
    // ("washrotom"). Both normalize to Showdown's "Rotom-Wash" order.
    const ROTOM_ALIASES: &[(&str, &str, &str)] = &[
        ("wash-rotom", "washrotom", "Wash"),
        ("heat-rotom", "heatrotom", "Heat"),
        ("frost-rotom", "frostrotom", "Frost"),
        ("fan-rotom", "fanrotom", "Fan"),
        ("mow-rotom", "mowrotom", "Mow"),
    ];
    for (hyph, concat, canonical) in ROTOM_ALIASES {
        if lower == *hyph || lower == *concat {
            return format!("Rotom-{canonical}");
        }
    }

    // Floette: in VGC Regulation M-A only AZ's Floette-Eternal is competitively
    // legal, so any string Limitless emits that contains "floette" (e.g.
    // "Floette", "Floette-Mega", "floetteeternal", "Eternal Flower Floette",
    // "AZ's Floette") collapses to the canonical "Floette-Eternal".
    if lower.contains("floette") {
        return "Floette-Eternal".to_string();
    }

    // Basculegion has two gendered forms with distinct stats (M: Atk 112;
    // F: SpA 112). Showdown keys them as `basculegionm` / `basculegionf`.
    // Limitless / Labmaus may emit "Basculegion-Male"/"Basculegion-Female",
    // "Basculegion (M)"/"(F)", or just "Basculegion" — normalize all to
    // the canonical -M / -F suffix. A bare "Basculegion" defaults to -M
    // (more common in competitive play).
    if lower.starts_with("basculegion") {
        if lower.contains("female") || lower.ends_with("f") || lower.ends_with("(f)") {
            return "Basculegion-F".to_string();
        }
        if lower.contains("male") || lower.ends_with("m") || lower.ends_with("(m)") {
            return "Basculegion-M".to_string();
        }
        return "Basculegion-M".to_string();
    }

    match lower.as_str() {
        "greninja-bond" | "ash-greninja" | "greninjabond" | "ashgreninja" => {
            "Greninja-Ash".to_string()
        }
        _ => trimmed.to_string(),
    }
}

/// Detect the "{Modifier} {Base...}" pattern Labmaus (and sometimes
/// Pokepaste) emits for legacy formes and rewrite it to Showdown's
/// base-first hyphenated order. Returns `None` when the input doesn't
/// start with a known keyword or the base would be empty.
fn rewrite_modifier_first(raw: &str) -> Option<String> {
    let tokens: Vec<&str> = raw
        .split(|c: char| c.is_whitespace() || c == '-')
        .filter(|t| !t.is_empty())
        .collect();
    if tokens.len() < 2 {
        return None;
    }
    let head = tokens[0].to_ascii_lowercase();
    let join_base = |base: &[&str]| {
        base.iter()
            .map(|t| titlecase(t))
            .collect::<Vec<_>>()
            .join("-")
    };
    match head.as_str() {
        "mega" => {
            let last = tokens[tokens.len() - 1].to_ascii_lowercase();
            if (last == "x" || last == "y") && tokens.len() >= 3 {
                let base = join_base(&tokens[1..tokens.len() - 1]);
                Some(format!("{}-Mega-{}", base, last.to_ascii_uppercase()))
            } else {
                Some(format!("{}-Mega", join_base(&tokens[1..])))
            }
        }
        "gmax" | "gigantamax" => Some(format!("{}-Gmax", join_base(&tokens[1..]))),
        "primal" => Some(format!("{}-Primal", join_base(&tokens[1..]))),
        _ => None,
    }
}

/// Detect regional-prefix formats ("Hisuian Typhlosion", "Alolan-Ninetales",
/// "Paldean Tauros Aqua Breed") and rewrite to Showdown's base-first
/// suffixed form. Paldean Tauros is a special case because its breeds use
/// a compound suffix (`tauros-paldeacombat`, etc.).
fn rewrite_regional_prefix(raw: &str) -> Option<String> {
    let tokens: Vec<&str> = raw
        .split(|c: char| c.is_whitespace() || c == '-')
        .filter(|t| !t.is_empty())
        .collect();
    if tokens.len() < 2 {
        return None;
    }
    let head = tokens[0].to_ascii_lowercase();
    let suffix = match head.as_str() {
        "hisuian" => "Hisui",
        "alolan" => "Alola",
        "galarian" => "Galar",
        "paldean" => "Paldea",
        "kantonian" => "Kanto",
        "unovan" => "Unova",
        _ => return None,
    };

    if suffix == "Paldea" && tokens.len() >= 3 {
        let second = tokens[1].to_ascii_lowercase();
        if second == "tauros" {
            let last_is_breed = tokens
                .last()
                .map(|t| t.eq_ignore_ascii_case("breed"))
                .unwrap_or(false);
            let breed_idx = if last_is_breed { tokens.len() - 2 } else { 2 };
            if let Some(breed) = tokens.get(breed_idx).map(|t| t.to_ascii_lowercase()) {
                if matches!(breed.as_str(), "combat" | "blaze" | "aqua") {
                    return Some(format!("Tauros-Paldea-{}", titlecase(&breed)));
                }
            }
        }
    }

    let base = tokens[1..]
        .iter()
        .map(|t| titlecase(t))
        .collect::<Vec<_>>()
        .join("-");
    if base.is_empty() {
        return None;
    }
    Some(format!("{}-{}", base, suffix))
}

/// Uppercase the first character, lowercase the rest. Good enough for
/// normalizing incoming tokens like "SCIZOR"/"scizor" → "Scizor".
fn titlecase(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(first) => {
            let mut out = String::with_capacity(s.len());
            out.extend(first.to_uppercase());
            for c in chars {
                out.extend(c.to_lowercase());
            }
            out
        }
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
    fn floette_base_is_aliased_to_eternal() {
        // In VGC/Regulation M-A only AZ's Floette-Eternal is competitively used;
        // raw "Floette" from usage/team data is semantically Floette-Eternal.
        assert_eq!(canonical_display_name("Floette"), "Floette-Eternal");
        assert_eq!(canonical_id("Floette"), "floetteeternal");
        assert_eq!(canonical_id("floette"), "floetteeternal");
        assert_eq!(canonical_display_name("Floette-Mega"), "Floette-Eternal");
    }

    #[test]
    fn floette_eternal_slug_variants_normalize() {
        // Limitless standings sometimes send the slug-id form ("floetteeternal")
        // or a space-separated display name ("Floette Eternal"). All variants
        // must collapse to "Floette-Eternal" so the sprite URL resolves.
        assert_eq!(canonical_display_name("floetteeternal"), "Floette-Eternal");
        assert_eq!(canonical_display_name("Floette Eternal"), "Floette-Eternal");
        assert_eq!(canonical_display_name("Floette-Eternal"), "Floette-Eternal");
        assert_eq!(canonical_display_name("floettemega"), "Floette-Eternal");
        assert!(primary_sprite_url("floetteeternal").ends_with("/floette-eternal.png"));
        assert!(primary_sprite_url("Floette Eternal").ends_with("/floette-eternal.png"));
    }

    #[test]
    fn floette_descriptive_variants_normalize() {
        // Limitless can also emit "Eternal Flower Floette" (the official forme
        // descriptor) and other variations. Any string containing "floette"
        // must collapse to "Floette-Eternal" — the only legal Floette in
        // Regulation M-A is AZ's Floette-Eternal.
        assert_eq!(
            canonical_display_name("Eternal Flower Floette"),
            "Floette-Eternal"
        );
        assert_eq!(canonical_display_name("AZ's Floette"), "Floette-Eternal");
        assert_eq!(canonical_display_name("Floette (Eternal)"), "Floette-Eternal");
        assert_eq!(canonical_display_name("FLOETTE"), "Floette-Eternal");
        assert!(
            primary_sprite_url("Eternal Flower Floette").ends_with("/floette-eternal.png")
        );
        assert!(primary_sprite_url("AZ's Floette").ends_with("/floette-eternal.png"));
        assert_eq!(canonical_id("Eternal Flower Floette"), "floetteeternal");
    }

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
    fn basculegion_aliases_normalize_to_canonical_gendered_slug() {
        // Limitless/Labmaus emit a variety of gendered display strings.
        // All variants must collapse to Showdown's canonical -M / -F slugs.
        // Bare "Basculegion" defaults to -M (more common in competitive).
        assert_eq!(canonical_display_name("Basculegion-M"), "Basculegion-M");
        assert_eq!(canonical_display_name("Basculegion-F"), "Basculegion-F");
        assert_eq!(canonical_display_name("Basculegion-Male"), "Basculegion-M");
        assert_eq!(canonical_display_name("Basculegion-Female"), "Basculegion-F");
        assert_eq!(canonical_display_name("Basculegion"), "Basculegion-M");
        assert_eq!(canonical_id("Basculegion-F"), "basculegionf");
        assert_eq!(canonical_id("Basculegion-M"), "basculegionm");
    }

    #[test]
    fn sprite_slug_parts_resolves_floette_base_to_eternal() {
        // Showdown's pokedex.json emits a "floette" base entry separately from
        // "floetteeternal". The base entry has forme=None, and without the
        // alias rewrite below sprite_slug_parts would return "floette" —
        // producing a /floette.png CDN URL that renders the red-flower (non-
        // competitive) form. In Regulation M-A only AZ's Floette-Eternal is
        // legal, so any "Floette" without an explicit forme must collapse to
        // the Eternal Flower slug.
        assert_eq!(sprite_slug_parts("Floette", None), "floette-eternal");
        assert!(primary_sprite_url_parts("Floette", None).ends_with("/floette-eternal.png"));
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
    fn rotom_concatenated_forms_flip_to_canonical() {
        // Limitless/Smogon sometimes emit the concatenated slug ("washrotom")
        // without a hyphen; we still need canonical_id to land on "rotomwash".
        assert_eq!(canonical_id("washrotom"), "rotomwash");
        assert_eq!(canonical_id("heatrotom"), "rotomheat");
        assert_eq!(canonical_id("frostrotom"), "rotomfrost");
        assert_eq!(canonical_id("fanrotom"), "rotomfan");
        assert_eq!(canonical_id("mowrotom"), "rotommow");
        assert_eq!(canonical_id("Washrotom"), "rotomwash");
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

    #[test]
    fn modifier_first_megas_rewritten_to_canonical() {
        assert_eq!(canonical_id("Mega Scizor"), "scizormega");
        assert_eq!(canonical_id("Mega Charizard X"), "charizardmegax");
        assert_eq!(canonical_id("Mega Charizard Y"), "charizardmegay");
        assert_eq!(canonical_id("Mega Mewtwo X"), "mewtwomegax");
        assert_eq!(canonical_id("Mega Mewtwo Y"), "mewtwomegay");
        assert!(primary_sprite_url("Mega Scizor").ends_with("/scizor-mega.png"));
        assert!(primary_sprite_url("Mega Charizard X").ends_with("/charizard-megax.png"));

        assert_eq!(canonical_id("Mega-Scizor"), "scizormega");
        assert_eq!(canonical_id("Mega-Charizard-X"), "charizardmegax");

        // Base-first inputs are a no-op for the rewriter but still resolve.
        assert_eq!(canonical_id("Scizor-Mega"), "scizormega");
        assert_eq!(canonical_id("Charizard-Mega-X"), "charizardmegax");
        assert!(primary_sprite_url("Scizor-Mega").ends_with("/scizor-mega.png"));
    }

    #[test]
    fn gigantamax_rewritten_to_gmax_suffix() {
        assert_eq!(canonical_id("Gigantamax Charizard"), "charizardgmax");
        assert_eq!(canonical_id("Gmax Charizard"), "charizardgmax");
        assert_eq!(canonical_id("Gmax-Snorlax"), "snorlaxgmax");
        assert!(primary_sprite_url("Gigantamax Charizard").ends_with("/charizard-gmax.png"));
    }

    #[test]
    fn primal_rewritten_to_primal_suffix() {
        assert_eq!(canonical_id("Primal Groudon"), "groudonprimal");
        assert_eq!(canonical_id("Primal Kyogre"), "kyogreprimal");
        assert!(primary_sprite_url("Primal Groudon").ends_with("/groudon-primal.png"));
    }

    #[test]
    fn regional_prefix_hisuian_alolan_galarian() {
        assert!(primary_sprite_url("Hisuian Typhlosion").ends_with("/typhlosion-hisui.png"));
        assert!(primary_sprite_url("Alolan Ninetales").ends_with("/ninetales-alola.png"));
        assert!(primary_sprite_url("Galarian Moltres").ends_with("/moltres-galar.png"));
        assert!(primary_sprite_url("Alolan-Ninetales").ends_with("/ninetales-alola.png"));
        assert_eq!(canonical_id("Hisuian Typhlosion"), "typhlosionhisui");
        assert_eq!(canonical_id("ALOLAN NINETALES"), "ninetalesalola");
    }

    #[test]
    fn regional_prefix_paldean_tauros_breeds() {
        assert!(primary_sprite_url("Paldean Tauros Aqua Breed").ends_with("/tauros-paldeaaqua.png"));
        assert!(
            primary_sprite_url("Paldean Tauros Blaze Breed").ends_with("/tauros-paldeablaze.png")
        );
        assert!(
            primary_sprite_url("Paldean Tauros Combat Breed").ends_with("/tauros-paldeacombat.png")
        );
        assert!(primary_sprite_url("Paldean Tauros Aqua").ends_with("/tauros-paldeaaqua.png"));
        assert!(primary_sprite_url("Tauros-Paldea-Aqua").ends_with("/tauros-paldeaaqua.png"));
    }

    #[test]
    fn regional_prefix_does_not_collide_with_modifier_first() {
        assert_eq!(canonical_id("Mega Scizor"), "scizormega");
        assert_eq!(canonical_id("Alolan Ninetales"), "ninetalesalola");
    }

    #[test]
    fn modifier_first_case_insensitive() {
        assert_eq!(canonical_id("mega scizor"), "scizormega");
        assert_eq!(canonical_id("MEGA SCIZOR"), "scizormega");
        assert_eq!(canonical_id("GiGaNtAmAx Charizard"), "charizardgmax");
    }
}
