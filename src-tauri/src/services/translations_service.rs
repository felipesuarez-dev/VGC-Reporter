use std::collections::HashMap;
use std::sync::Arc;

use tokio::sync::{Mutex, OnceCell};

use crate::adapters::gen9_supplement::{gen9_ability_names, gen9_move_names};
use crate::adapters::{LocalizedName, PokeApiClient, TranslationTable};
use crate::error::AppError;

#[derive(Clone)]
pub struct TranslationsService {
    client: PokeApiClient,
    cache: Arc<OnceCell<TranslationTable>>,
    lock: Arc<Mutex<()>>,
}

impl TranslationsService {
    pub fn new(client: PokeApiClient) -> Self {
        Self {
            client,
            cache: Arc::new(OnceCell::new()),
            lock: Arc::new(Mutex::new(())),
        }
    }

    pub async fn get_table(&self) -> Result<TranslationTable, AppError> {
        if let Some(t) = self.cache.get() {
            return Ok(t.clone());
        }
        let _guard = self.lock.lock().await;
        if let Some(t) = self.cache.get() {
            return Ok(t.clone());
        }
        let mut table = self.client.fetch_translation_table().await?;
        apply_name_supplement(&mut table.moves, gen9_move_names());
        apply_name_supplement(&mut table.abilities, gen9_ability_names());
        let _ = self.cache.set(table.clone());
        Ok(table)
    }
}

/// Overlays a curated Spanish name supplement on top of the PokéAPI table.
/// Only fills entries the upstream doesn't cover yet — either missing
/// entirely, or present but with `es == en` (the sentinel used by
/// `parse_names_csv` when PokéAPI has no Spanish row).
fn apply_name_supplement(
    into: &mut HashMap<String, LocalizedName>,
    supplement: HashMap<String, LocalizedName>,
) {
    for (key, entry) in supplement {
        match into.get(&key) {
            Some(existing) if existing.es != existing.en => continue,
            _ => {
                into.insert(key, entry);
            }
        }
    }
}
