use crate::adapters::limitless_client::{LimitlessDecklistEntry, LimitlessStanding};
use crate::adapters::sprite_resolver::{
    canonical_display_name, canonical_id, fallback_sprite_url, primary_sprite_url,
};
use crate::domain::format::Format;
use crate::domain::usage_stats::{
    MetaSnapshot, MovesetUsage, PokemonUsage, TeammateUsage, UsageEntry,
};
use chrono::Utc;
use std::collections::{HashMap, HashSet};

/// Aggregates Limitless standings into a MetaSnapshot.
///
/// Species usage is reported as **team-fraction** (teams using the species /
/// total teams), matching Pikalytics' own semantics. Items / moves / abilities
/// stay on pick-fraction because a single team can use the same item on
/// multiple members and the "top in meta" card is really asking about picks.
pub fn aggregate(format: Format, standings: Vec<Vec<LimitlessStanding>>) -> MetaSnapshot {
    let tournaments_used = standings.len() as u32;

    let mut pokemon_count: HashMap<String, PokemonAccumulator> = HashMap::new();
    let mut items_count: HashMap<String, u32> = HashMap::new();
    let mut moves_count: HashMap<String, u32> = HashMap::new();
    let mut abilities_count: HashMap<String, u32> = HashMap::new();
    let mut total_teams: u32 = 0;
    let mut total_entries: u32 = 0;

    for standings_list in standings {
        for standing in standings_list {
            let Some(deck) = standing.decklist else {
                continue;
            };
            if deck.is_empty() {
                continue;
            }
            total_teams += 1;

            // De-duplicate by canonical species id so a team that somehow
            // repeats a form still counts once toward the team-fraction.
            let mut seen_on_team: HashSet<String> = HashSet::new();

            // (id, display, canonical) — canonical is the hyphenated form the
            // sprite CDN understands; display is the prettified version for UI.
            let teammates: Vec<(String, String, String)> = deck
                .iter()
                .filter_map(|d| {
                    d.species_name().map(|s| {
                        let canonical = canonical_display_name(s);
                        (canonical_id(s), prettify(&canonical), canonical)
                    })
                })
                .collect();

            for entry in &deck {
                total_entries += 1;
                let Some(species_raw) = entry.species_name() else {
                    continue;
                };
                let key = canonical_id(species_raw);
                let canonical = canonical_display_name(species_raw);
                let display = prettify(&canonical);
                let acc = pokemon_count
                    .entry(key.clone())
                    .or_insert_with(|| PokemonAccumulator::new(display, canonical));

                if seen_on_team.insert(key.clone()) {
                    acc.count += 1;
                }

                accumulate(entry, acc);

                for (t_key, t_display, t_canonical) in &teammates {
                    if t_key != &key {
                        let slot =
                            acc.teammates
                                .entry(t_key.clone())
                                .or_insert_with(|| TeammateAcc {
                                    display: t_display.clone(),
                                    canonical: t_canonical.clone(),
                                    count: 0,
                                });
                        slot.count += 1;
                    }
                }

                if let Some(item) = entry.item.as_deref() {
                    let item = prettify(item);
                    *items_count.entry(item).or_insert(0) += 1;
                }
                if let Some(moves) = &entry.moves {
                    for mv in moves {
                        let mv = prettify(mv);
                        *moves_count.entry(mv).or_insert(0) += 1;
                    }
                }
                if let Some(ability) = entry.ability.as_deref() {
                    let ability = prettify(ability);
                    *abilities_count.entry(ability).or_insert(0) += 1;
                }
            }
        }
    }

    let teams_div = total_teams.max(1) as f32;

    let mut pokemon: Vec<PokemonUsage> = pokemon_count
        .into_values()
        .map(|acc| PokemonUsage {
            species: acc.display.clone(),
            usage_percent: (acc.count as f32 / teams_div) * 100.0,
            count: acc.count,
            top_items: top_n(&acc.items, 5),
            top_moves: top_n(&acc.moves, 6),
            top_abilities: top_n(&acc.abilities, 3),
            top_tera: Vec::new(),
            top_teammates: top_teammates(&acc.teammates, 5),
            top_natures: top_n(&acc.natures, 5),
            common_movesets: top_movesets(&acc.movesets, 5),
            sprite_url: primary_sprite_url(&acc.canonical),
            sprite_fallback_url: fallback_sprite_url(&acc.canonical),
            home_sprite_url: None,
        })
        .collect();
    pokemon.sort_by(|a, b| b.usage_percent.partial_cmp(&a.usage_percent).unwrap());

    let top_items = top_n(&items_count, 15);
    let top_moves = top_n(&moves_count, 20);
    let top_abilities = top_n(&abilities_count, 10);

    MetaSnapshot {
        format,
        generated_at: Utc::now(),
        source: format!("Limitless VGC — {} tournaments", tournaments_used),
        tournaments_used,
        total_entries,
        pokemon,
        top_items,
        top_moves,
        top_abilities,
        top_tera: Vec::new(),
        from_date: None,
        to_date: None,
    }
}

fn accumulate(entry: &LimitlessDecklistEntry, acc: &mut PokemonAccumulator) {
    if let Some(item) = entry.item.as_deref() {
        *acc.items.entry(prettify(item)).or_insert(0) += 1;
    }
    if let Some(ability) = entry.ability.as_deref() {
        *acc.abilities.entry(prettify(ability)).or_insert(0) += 1;
    }
    if let Some(nature) = entry.nature.as_deref() {
        let nature = prettify(nature);
        if !nature.is_empty() {
            *acc.natures.entry(nature).or_insert(0) += 1;
        }
    }
    if let Some(moves) = &entry.moves {
        for mv in moves {
            *acc.moves.entry(prettify(mv)).or_insert(0) += 1;
        }
        let mut signature: Vec<String> = moves
            .iter()
            .map(|m| prettify(m))
            .filter(|m| !m.is_empty())
            .collect();
        if !signature.is_empty() {
            signature.sort();
            *acc.movesets.entry(signature).or_insert(0) += 1;
        }
    }
}

fn top_n(map: &HashMap<String, u32>, n: usize) -> Vec<UsageEntry> {
    let total: u32 = map.values().sum();
    let total = total.max(1) as f32;
    let mut items: Vec<(String, u32)> = map.iter().map(|(k, v)| (k.clone(), *v)).collect();
    items.sort_by(|a, b| b.1.cmp(&a.1));
    items
        .into_iter()
        .take(n)
        .map(|(name, count)| UsageEntry {
            name,
            usage_percent: (count as f32 / total) * 100.0,
            count,
        })
        .collect()
}

/// Normalised `top N` from a float-weighted histogram.
///
/// Shared between the Limitless path (raw counts cast to f64) and the Smogon
/// path (`usage * ratio` sums). Both produce "% of this field's universe"
/// with identical semantics.
pub fn top_n_normalized(counts: &HashMap<String, f64>, n: usize) -> Vec<UsageEntry> {
    let total: f64 = counts.values().sum();
    let total = if total > 0.0 { total } else { 1.0 };
    let mut items: Vec<(&String, &f64)> = counts.iter().collect();
    items.sort_by(|a, b| b.1.partial_cmp(a.1).unwrap_or(std::cmp::Ordering::Equal));
    items
        .into_iter()
        .take(n)
        .map(|(name, value)| UsageEntry {
            name: name.clone(),
            usage_percent: ((value / total) * 100.0) as f32,
            count: value.round() as u32,
        })
        .collect()
}

pub fn prettify_public(s: &str) -> String {
    prettify(s)
}

fn prettify(s: &str) -> String {
    // Replace underscores/dashes with spaces and Title Case words.
    let cleaned = s.replace(['_', '-'], " ");
    cleaned
        .split_whitespace()
        .map(|w| {
            let mut c = w.chars();
            match c.next() {
                Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

struct PokemonAccumulator {
    /// Prettified user-facing name ("Rotom Wash").
    display: String,
    /// Hyphenated canonical form ("Rotom-Wash") — the sprite resolver's
    /// expected input. We MUST NOT pass the prettified version to the CDN
    /// because the gen5 slug needs "-" to split base and forme.
    canonical: String,
    count: u32,
    items: HashMap<String, u32>,
    moves: HashMap<String, u32>,
    abilities: HashMap<String, u32>,
    teammates: HashMap<String, TeammateAcc>,
    natures: HashMap<String, u32>,
    movesets: HashMap<Vec<String>, u32>,
}

struct TeammateAcc {
    display: String,
    canonical: String,
    count: u32,
}

impl PokemonAccumulator {
    fn new(display: String, canonical: String) -> Self {
        Self {
            display,
            canonical,
            count: 0,
            items: HashMap::new(),
            moves: HashMap::new(),
            abilities: HashMap::new(),
            teammates: HashMap::new(),
            natures: HashMap::new(),
            movesets: HashMap::new(),
        }
    }
}

fn top_teammates(map: &HashMap<String, TeammateAcc>, n: usize) -> Vec<TeammateUsage> {
    let total: u32 = map.values().map(|t| t.count).sum();
    let total = total.max(1) as f32;
    let mut items: Vec<&TeammateAcc> = map.values().collect();
    items.sort_by(|a, b| b.count.cmp(&a.count));
    items
        .into_iter()
        .take(n)
        .map(|t| TeammateUsage {
            name: t.display.clone(),
            usage_percent: (t.count as f32 / total) * 100.0,
            count: t.count,
            sprite_url: primary_sprite_url(&t.canonical),
            sprite_fallback_url: fallback_sprite_url(&t.canonical),
        })
        .collect()
}

fn top_movesets(map: &HashMap<Vec<String>, u32>, n: usize) -> Vec<MovesetUsage> {
    let total: u32 = map.values().sum();
    let total = total.max(1) as f32;
    let mut items: Vec<(&Vec<String>, &u32)> = map.iter().collect();
    items.sort_by(|a, b| b.1.cmp(a.1));
    items
        .into_iter()
        .take(n)
        .map(|(moves, count)| MovesetUsage {
            moves: moves.clone(),
            count: *count,
            usage_percent: (*count as f32 / total) * 100.0,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::adapters::limitless_client::{LimitlessDecklistEntry, LimitlessStanding};

    fn entry(species: &str) -> LimitlessDecklistEntry {
        LimitlessDecklistEntry {
            id: None,
            name: None,
            species: Some(species.to_string()),
            pokemon: None,
            item: None,
            ability: None,
            tera: None,
            tera_type: None,
            moves: None,
            nature: None,
        }
    }

    fn standing(deck: Vec<LimitlessDecklistEntry>) -> LimitlessStanding {
        LimitlessStanding {
            placing: Some(1),
            name: None,
            player: None,
            country: None,
            decklist: Some(deck),
            record: None,
            drop: None,
        }
    }

    #[test]
    fn teammates_are_prettified_not_canonical() {
        let standings = vec![vec![standing(vec![
            entry("fluttermane"),
            entry("iron-hands"),
            entry("Amoonguss"),
        ])]];
        let snap = aggregate(Format::RegulationMA, standings);

        let flutter = snap
            .pokemon
            .iter()
            .find(|p| p.species == "Fluttermane")
            .expect("flutter mane should be present");

        let teammate_names: Vec<&str> = flutter
            .top_teammates
            .iter()
            .map(|e| e.name.as_str())
            .collect();

        assert!(teammate_names.contains(&"Iron Hands"));
        assert!(teammate_names.contains(&"Amoonguss"));
        assert!(
            flutter.top_teammates.iter().all(|e| e
                .name
                .chars()
                .next()
                .map(|c| c.is_ascii_uppercase())
                .unwrap_or(false)),
            "teammate display names should start with uppercase; got {teammate_names:?}"
        );
    }

    #[test]
    fn inverted_rotom_forms_are_normalized_to_canonical_display() {
        let standings = vec![vec![standing(vec![
            entry("Wash-Rotom"),
            entry("Heat-Rotom"),
            entry("Amoonguss"),
        ])]];
        let snap = aggregate(Format::RegulationMA, standings);

        let species: Vec<&str> = snap.pokemon.iter().map(|p| p.species.as_str()).collect();

        assert!(
            species.contains(&"Rotom Wash"),
            "expected Rotom Wash display, got {species:?}"
        );
        assert!(
            species.contains(&"Rotom Heat"),
            "expected Rotom Heat display, got {species:?}"
        );
        assert!(
            !species
                .iter()
                .any(|s| *s == "Wash Rotom" || *s == "Heat Rotom"),
            "inverted forms should be normalized; got {species:?}"
        );
    }

    #[test]
    fn rotom_wash_keeps_hyphenated_sprite_slug() {
        // "Rotom Wash" (prettified, with space) used to reach primary_sprite_url
        // and collapse to "rotomwash" — a 404 on gen5. The fix routes the
        // canonical hyphenated form through the resolver so the URL keeps
        // the "-" the CDN expects.
        let standings = vec![vec![standing(vec![
            entry("Wash-Rotom"),
            entry("Amoonguss"),
        ])]];
        let snap = aggregate(Format::RegulationMA, standings);
        let rotom = snap
            .pokemon
            .iter()
            .find(|p| p.species == "Rotom Wash")
            .expect("rotom wash should be present");
        assert!(
            rotom.sprite_url.ends_with("/rotom-wash.png"),
            "got {}",
            rotom.sprite_url
        );
        assert_eq!(
            rotom.sprite_fallback_url.as_deref(),
            Some("https://play.pokemonshowdown.com/sprites/dex/rotomwash.png")
        );
    }

    #[test]
    fn teammates_carry_sprite_urls() {
        let standings = vec![vec![standing(vec![
            entry("Wash-Rotom"),
            entry("Amoonguss"),
            entry("Incineroar"),
        ])]];
        let snap = aggregate(Format::RegulationMA, standings);
        let amoonguss = snap
            .pokemon
            .iter()
            .find(|p| p.species == "Amoonguss")
            .expect("amoonguss");
        let rotom_mate = amoonguss
            .top_teammates
            .iter()
            .find(|t| t.name == "Rotom Wash")
            .expect("rotom wash teammate");
        assert!(
            rotom_mate.sprite_url.ends_with("/rotom-wash.png"),
            "got {}",
            rotom_mate.sprite_url
        );
        assert_eq!(
            rotom_mate.sprite_fallback_url.as_deref(),
            Some("https://play.pokemonshowdown.com/sprites/dex/rotomwash.png")
        );
    }

    #[test]
    fn usage_percent_is_team_fraction_not_pick_fraction() {
        // Team-fraction: 1 team uses Incineroar, 1 team total → 100%.
        // Under the old pick-fraction divisor this would be 1/6 ≈ 16.7%.
        let deck = vec![
            entry("Incineroar"),
            entry("Amoonguss"),
            entry("Iron Hands"),
            entry("Rillaboom"),
            entry("Dondozo"),
            entry("Tatsugiri"),
        ];
        let snap = aggregate(Format::RegulationMA, vec![vec![standing(deck)]]);
        let inc = snap
            .pokemon
            .iter()
            .find(|p| p.species == "Incineroar")
            .expect("incineroar");
        assert!(
            (inc.usage_percent - 100.0).abs() < 0.01,
            "got {}",
            inc.usage_percent
        );
    }
}
