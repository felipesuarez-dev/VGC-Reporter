use crate::adapters::pkmn_data_client::{into_pokemon_set, PkmnSetsFile};
use crate::adapters::PkmnDataClient;
use crate::config;
use crate::domain::sets::{PokemonSet, SetsBundle};
use crate::error::AppError;
use crate::storage::CacheRepo;
use std::sync::Arc;

const DOUBLES_SLUGS: &[&str] = &["gen9vgc2025", "gen9vgc2024regg", "gen9vgc2024"];
const SINGLES_SLUGS: &[&str] = &["gen9ou"];

#[derive(Clone)]
pub struct SetsService {
    pkmn: PkmnDataClient,
    cache: Arc<CacheRepo>,
}

impl SetsService {
    pub fn new(pkmn: PkmnDataClient, cache: Arc<CacheRepo>) -> Self {
        Self { pkmn, cache }
    }

    /// Fetches curated sets for a species across doubles and singles slugs,
    /// walking each fallback chain until something hits.
    pub async fn get_bundle(&self, species: &str) -> Result<SetsBundle, AppError> {
        let cache_key = format!("sets-bundle::{}", species.to_lowercase());
        if let Some(bytes) = self.cache.get(&cache_key)? {
            if let Ok(b) = serde_json::from_slice::<SetsBundle>(&bytes) {
                return Ok(b);
            }
        }

        let (doubles, doubles_source) = self.collect_for(species, DOUBLES_SLUGS).await?;
        let (singles, singles_source) = self.collect_for(species, SINGLES_SLUGS).await?;

        let bundle = SetsBundle {
            species: species.to_string(),
            doubles,
            singles,
            doubles_source,
            singles_source,
        };

        if let Ok(bytes) = serde_json::to_vec(&bundle) {
            let _ = self
                .cache
                .put(&cache_key, &bytes, config::TTL_SHOWDOWN_DATA);
        }

        Ok(bundle)
    }

    async fn collect_for(
        &self,
        species: &str,
        slugs: &[&str],
    ) -> Result<(Vec<PokemonSet>, Option<String>), AppError> {
        for slug in slugs {
            let Some(file) = self.pkmn.fetch_sets(slug).await? else {
                continue;
            };
            if let Some(sets) = pick_species(&file, species) {
                if !sets.is_empty() {
                    return Ok((sets, Some((*slug).to_string())));
                }
            }
        }
        Ok((Vec::new(), None))
    }
}

/// Looks up a species in a sets file. The keys are display names and the
/// match is case-insensitive on the alphanumeric slug.
fn pick_species(file: &PkmnSetsFile, species: &str) -> Option<Vec<PokemonSet>> {
    let target = slug(species);
    for (name, sets) in file.iter() {
        if slug(name) == target {
            return Some(
                sets.iter()
                    .map(|(set_name, raw)| into_pokemon_set(set_name.clone(), raw.clone()))
                    .collect(),
            );
        }
    }
    None
}

fn slug(s: &str) -> String {
    s.to_lowercase()
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::adapters::pkmn_data_client::RawSet;
    use std::collections::BTreeMap;

    #[test]
    fn slug_strips_punctuation() {
        assert_eq!(slug("Mr. Mime"), "mrmime");
        assert_eq!(slug("Tauros-Paldea-Combat"), "taurospaldeacombat");
    }

    #[test]
    fn pick_species_matches_case_insensitive() {
        let mut file: PkmnSetsFile = BTreeMap::new();
        let mut sets = BTreeMap::new();
        sets.insert(
            "Bulky".to_string(),
            RawSet {
                item: Some("Leftovers".into()),
                ability: Some("Intimidate".into()),
                nature: Some("Adamant".into()),
                teratypes: None,
                evs: Default::default(),
                moves: vec![],
            },
        );
        file.insert("Incineroar".to_string(), sets);
        let got = pick_species(&file, "incineroar").unwrap();
        assert_eq!(got.len(), 1);
        assert_eq!(got[0].item.as_deref(), Some("Leftovers"));
    }
}
