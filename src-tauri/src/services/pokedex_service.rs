use crate::adapters::showdown_client::EntityDescriptions;
use crate::adapters::sprite_resolver::{
    canonical_display_name, canonical_id, fallback_sprite_url, primary_sprite_url,
};
use crate::adapters::{LocalizedDescription, PokeApiClient, ShowdownClient};
use crate::config;
use crate::domain::move_::MoveSummary;
use crate::domain::pokemon::{Pokemon, PokemonType};
use crate::error::AppError;
use crate::storage::CacheRepo;
use std::collections::HashMap;
use std::sync::Arc;

fn canonical_species_id(s: &str) -> String {
    s.chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .map(|c| c.to_ascii_lowercase())
        .collect()
}

/// Joins Showdown English descriptions (authoritative for competitive text)
/// with PokéAPI Spanish flavor. Keys come from the English map since that is
/// what the frontend already asks for (normalized Showdown names).
fn merge_lang(
    en: HashMap<String, String>,
    es_map: &HashMap<String, LocalizedDescription>,
) -> HashMap<String, LocalizedDescription> {
    let mut out: HashMap<String, LocalizedDescription> = HashMap::with_capacity(en.len());
    for (key, en_text) in en {
        let es_text = es_map
            .get(&key)
            .map(|d| d.es.as_str())
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
            .unwrap_or_else(|| en_text.clone());
        out.insert(
            key,
            LocalizedDescription {
                en: en_text,
                es: es_text,
            },
        );
    }
    out
}

#[derive(Clone)]
pub struct PokedexService {
    showdown: ShowdownClient,
    pokeapi: PokeApiClient,
    cache: Arc<CacheRepo>,
}

impl PokedexService {
    pub fn new(showdown: ShowdownClient, pokeapi: PokeApiClient, cache: Arc<CacheRepo>) -> Self {
        Self {
            showdown,
            pokeapi,
            cache,
        }
    }

    pub async fn all(&self) -> Result<Vec<Pokemon>, AppError> {
        // v3 bumps the cache key to include home_sprite_url on each entry.
        const KEY: &str = "pokedex::all::v3";
        if let Some(bytes) = self.cache.get(KEY)? {
            if let Ok(list) = serde_json::from_slice::<Vec<Pokemon>>(&bytes) {
                return Ok(list);
            }
        }
        let pokedex = self.showdown.fetch_pokedex().await?;
        let list = pokedex.pokemon;
        let bytes = serde_json::to_vec(&list)?;
        self.cache.put(KEY, &bytes, config::TTL_SHOWDOWN_DATA)?;
        Ok(list)
    }

    pub async fn search(
        &self,
        query: Option<&str>,
        type_filter: Option<PokemonType>,
    ) -> Result<Vec<Pokemon>, AppError> {
        let all = self.all().await?;
        let q = query.map(|q| q.to_lowercase());
        let filtered = all
            .into_iter()
            .filter(|p| {
                let q_ok = q
                    .as_ref()
                    .map(|qq| p.name.to_lowercase().contains(qq) || p.id.contains(qq))
                    .unwrap_or(true);
                let t_ok = type_filter
                    .as_ref()
                    .map(|t| p.types.contains(t))
                    .unwrap_or(true);
                q_ok && t_ok
            })
            .collect();
        Ok(filtered)
    }

    pub async fn get(&self, id: &str) -> Result<Option<Pokemon>, AppError> {
        let all = self.all().await?;
        let needle = canonical_id(id);
        Ok(all.into_iter().find(|p| canonical_id(&p.id) == needle))
    }

    /// Resolve the three sprite URLs (primary, fallback, HOME) for a raw
    /// display-name string. Looks the canonical species up in the Pokédex so
    /// callers inherit the exact same URLs that already render correctly in
    /// the Pokédex UI — that's the load-bearing difference for multi-hyphen
    /// formes (Calyrex-Ice-Rider, Urshifu-Rapid-Strike, ...) where the flat
    /// `primary_sprite_url` heuristic would produce a CDN 404.
    ///
    /// Falls back to the heuristic URLs + no HOME when the species isn't
    /// indexed (unknown names or transient dex fetch errors).
    pub async fn sprite_urls_for(&self, raw: &str) -> (String, Option<String>, Option<String>) {
        let canonical = canonical_display_name(raw);
        let id = canonical_id(&canonical);
        if !id.is_empty() {
            if let Ok(Some(p)) = self.get(&id).await {
                return (p.sprite_url, p.sprite_fallback_url, p.home_sprite_url);
            }
        }
        (
            primary_sprite_url(&canonical),
            fallback_sprite_url(&canonical),
            None,
        )
    }

    pub async fn list_items(&self) -> Result<Vec<String>, AppError> {
        // v2 bumps the cache key after items migrated from items.json to
        // items.js; older caches were empty lists from the failed parse.
        const KEY: &str = "showdown::items::v2";
        if let Some(bytes) = self.cache.get(KEY)? {
            if let Ok(list) = serde_json::from_slice::<Vec<String>>(&bytes) {
                return Ok(list);
            }
        }
        let list = self.showdown.fetch_items().await?;
        let bytes = serde_json::to_vec(&list)?;
        self.cache.put(KEY, &bytes, config::TTL_SHOWDOWN_DATA)?;
        Ok(list)
    }

    pub async fn list_moves(&self) -> Result<Vec<String>, AppError> {
        const KEY: &str = "showdown::moves";
        if let Some(bytes) = self.cache.get(KEY)? {
            if let Ok(list) = serde_json::from_slice::<Vec<String>>(&bytes) {
                return Ok(list);
            }
        }
        let list = self.showdown.fetch_moves().await?;
        let bytes = serde_json::to_vec(&list)?;
        self.cache.put(KEY, &bytes, config::TTL_SHOWDOWN_DATA)?;
        Ok(list)
    }

    pub async fn list_abilities(&self) -> Result<Vec<String>, AppError> {
        const KEY: &str = "showdown::abilities_from_pokedex";
        if let Some(bytes) = self.cache.get(KEY)? {
            if let Ok(list) = serde_json::from_slice::<Vec<String>>(&bytes) {
                return Ok(list);
            }
        }
        let pokemon = self.all().await?;
        let mut set: std::collections::BTreeSet<String> = std::collections::BTreeSet::new();
        for p in &pokemon {
            for a in &p.abilities {
                if !a.is_empty() {
                    set.insert(a.clone());
                }
            }
        }
        let list: Vec<String> = set.into_iter().collect();
        let bytes = serde_json::to_vec(&list)?;
        self.cache.put(KEY, &bytes, config::TTL_SHOWDOWN_DATA)?;
        Ok(list)
    }

    pub async fn move_catalog(&self) -> Result<HashMap<String, MoveSummary>, AppError> {
        self.move_details().await
    }

    async fn move_details(&self) -> Result<HashMap<String, MoveSummary>, AppError> {
        const KEY: &str = "showdown::move_details";
        if let Some(bytes) = self.cache.get(KEY)? {
            if let Ok(map) = serde_json::from_slice::<HashMap<String, MoveSummary>>(&bytes) {
                return Ok(map);
            }
        }
        let map = self.showdown.fetch_move_details().await?;
        let bytes = serde_json::to_vec(&map)?;
        self.cache.put(KEY, &bytes, config::TTL_SHOWDOWN_DATA)?;
        Ok(map)
    }

    async fn learnsets(&self) -> Result<HashMap<String, Vec<String>>, AppError> {
        const KEY: &str = "showdown::learnsets";
        if let Some(bytes) = self.cache.get(KEY)? {
            if let Ok(map) = serde_json::from_slice::<HashMap<String, Vec<String>>>(&bytes) {
                return Ok(map);
            }
        }
        let map = self.showdown.fetch_learnsets().await?;
        let bytes = serde_json::to_vec(&map)?;
        self.cache.put(KEY, &bytes, config::TTL_SHOWDOWN_DATA)?;
        Ok(map)
    }

    pub async fn get_entity_descriptions(&self) -> Result<EntityDescriptions, AppError> {
        // v2 bumps the cache key now that descriptions are bilingual
        // (LocalizedDescription instead of plain String).
        const KEY: &str = "showdown::entity_descriptions::v2";
        if let Some(bytes) = self.cache.get(KEY)? {
            if let Ok(data) = serde_json::from_slice::<EntityDescriptions>(&bytes) {
                return Ok(data);
            }
        }

        // Fetch English descriptions from Showdown and Spanish flavor text from
        // PokéAPI in parallel. The PokéAPI side may fail (network/format
        // drift); we degrade gracefully to English-only if it does.
        let showdown_fut = self.showdown.fetch_entity_descriptions_en();
        let abilities_fut = self.pokeapi.fetch_ability_descriptions();
        let moves_fut = self.pokeapi.fetch_move_descriptions();
        let items_fut = self.pokeapi.fetch_item_descriptions();

        let (en_maps, es_abilities, es_moves, es_items) =
            tokio::join!(showdown_fut, abilities_fut, moves_fut, items_fut);

        let en_maps = en_maps?;
        let es_abilities = es_abilities.unwrap_or_default();
        let es_moves = es_moves.unwrap_or_default();
        let es_items = es_items.unwrap_or_default();

        let data = EntityDescriptions {
            items: merge_lang(en_maps.items, &es_items),
            moves: merge_lang(en_maps.moves, &es_moves),
            abilities: merge_lang(en_maps.abilities, &es_abilities),
        };

        let bytes = serde_json::to_vec(&data)?;
        self.cache.put(KEY, &bytes, config::TTL_SHOWDOWN_DATA)?;
        Ok(data)
    }

    pub async fn list_moves_for_species(
        &self,
        species: &str,
    ) -> Result<Vec<MoveSummary>, AppError> {
        let details = self.move_details().await?;
        let learnsets = self.learnsets().await?;
        let id = canonical_species_id(species);
        let Some(move_ids) = learnsets.get(&id) else {
            return Ok(Vec::new());
        };
        let mut out: Vec<MoveSummary> = move_ids
            .iter()
            .filter_map(|mid| details.get(mid).cloned())
            .collect();
        out.sort_by(|a, b| a.name.cmp(&b.name));
        out.dedup_by(|a, b| a.id == b.id);
        Ok(out)
    }

    /// Inverted learnsets: `move_id -> [species_id, ...]`.
    /// Powers the Pokédex move filter in the frontend.
    pub async fn learnsets_index(&self) -> Result<HashMap<String, Vec<String>>, AppError> {
        let learnsets = self.learnsets().await?;
        let mut inverted: HashMap<String, Vec<String>> = HashMap::new();
        for (species_id, moves) in learnsets {
            for move_id in moves {
                inverted
                    .entry(move_id)
                    .or_default()
                    .push(species_id.clone());
            }
        }
        for species_list in inverted.values_mut() {
            species_list.sort();
            species_list.dedup();
        }
        Ok(inverted)
    }
}
