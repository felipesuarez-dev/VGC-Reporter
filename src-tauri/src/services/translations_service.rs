use std::collections::HashMap;
use std::sync::Arc;

use tokio::sync::{Mutex, OnceCell};

use crate::adapters::gen9_supplement::{gen9_ability_names, gen9_item_names, gen9_move_names};
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
        apply_name_supplement(&mut table.items, gen9_item_names());
        let _ = self.cache.set(table.clone());
        Ok(table)
    }
}

/// Overlays a curated EN/ES name supplement on top of the PokéAPI table.
///
/// Two scenarios:
///
/// 1. Entry already in PokéAPI: only patch the ES field, and only when the
///    upstream fell back to EN (sentinel `existing.es == existing.en`). The
///    supplement does not touch `pt`/`it`/`fr` — those fields in the
///    supplement entry are empty sentinels, so PokéAPI's translations (or
///    its EN fallback) stand.
///
/// 2. Entry absent from PokéAPI: insert with the supplement's EN/ES and
///    fill `pt`/`it`/`fr` with the EN fallback. Without this, the supplement
///    would inject empty strings into the user-facing struct.
fn apply_name_supplement(
    into: &mut HashMap<String, LocalizedName>,
    supplement: HashMap<String, LocalizedName>,
) {
    for (key, supp) in supplement {
        match into.get_mut(&key) {
            Some(existing) => {
                // Patch each locale only where PokéAPI fell back to English
                // (sentinel: field == en) AND the supplement supplies a value.
                // Empty supplement locales (the moves/abilities case) are left
                // untouched so PokéAPI's own translations stand.
                if !supp.es.is_empty() && existing.es == existing.en {
                    existing.es = supp.es;
                }
                if !supp.pt.is_empty() && existing.pt == existing.en {
                    existing.pt = supp.pt;
                }
                if !supp.it.is_empty() && existing.it == existing.en {
                    existing.it = supp.it;
                }
                if !supp.fr.is_empty() && existing.fr == existing.en {
                    existing.fr = supp.fr;
                }
            }
            None => {
                let en = supp.en.clone();
                into.insert(
                    key,
                    LocalizedName {
                        es: if supp.es.is_empty() { en.clone() } else { supp.es },
                        pt: if supp.pt.is_empty() { en.clone() } else { supp.pt },
                        it: if supp.it.is_empty() { en.clone() } else { supp.it },
                        fr: if supp.fr.is_empty() { en.clone() } else { supp.fr },
                        en: supp.en,
                    },
                );
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::adapters::LocalizedName;

    fn name(en: &str, es: &str, pt: &str, it: &str, fr: &str) -> LocalizedName {
        LocalizedName {
            en: en.into(),
            es: es.into(),
            pt: pt.into(),
            it: it.into(),
            fr: fr.into(),
        }
    }

    #[test]
    fn supplement_skips_when_pokeapi_already_has_spanish() {
        let mut into: HashMap<String, LocalizedName> = HashMap::new();
        into.insert(
            "protect".into(),
            name("Protect", "Protección", "Proteção", "Protezione", "Abri"),
        );
        let mut supp: HashMap<String, LocalizedName> = HashMap::new();
        // Sentinel: supplement gives manual ES, empty pt/it/fr.
        supp.insert(
            "protect".into(),
            name("Protect", "Protect-ES-MANUAL", "", "", ""),
        );
        apply_name_supplement(&mut into, supp);
        let merged = into.get("protect").unwrap();
        // PokéAPI's ES survives because existing.es != existing.en.
        assert_eq!(merged.es, "Protección");
        // PT/IT/FR untouched.
        assert_eq!(merged.pt, "Proteção");
        assert_eq!(merged.it, "Protezione");
        assert_eq!(merged.fr, "Abri");
    }

    #[test]
    fn supplement_fills_spanish_when_pokeapi_fell_back_to_english() {
        let mut into: HashMap<String, LocalizedName> = HashMap::new();
        // Sentinel: PokéAPI had no ES row → es field equals en (the fallback).
        into.insert(
            "wave_crash".into(),
            name("Wave Crash", "Wave Crash", "Wave Crash", "Wave Crash", "Wave Crash"),
        );
        let mut supp: HashMap<String, LocalizedName> = HashMap::new();
        supp.insert(
            "wave_crash".into(),
            name("Wave Crash", "Surfataque", "", "", ""),
        );
        apply_name_supplement(&mut into, supp);
        let merged = into.get("wave_crash").unwrap();
        assert_eq!(merged.es, "Surfataque");
        // pt/it/fr were also EN-fallback already; supplement doesn't touch them.
        assert_eq!(merged.pt, "Wave Crash");
        assert_eq!(merged.it, "Wave Crash");
        assert_eq!(merged.fr, "Wave Crash");
    }

    #[test]
    fn supplement_inserts_with_en_fallback_for_other_locales_when_missing() {
        let mut into: HashMap<String, LocalizedName> = HashMap::new();
        let mut supp: HashMap<String, LocalizedName> = HashMap::new();
        supp.insert(
            "matcha_gotcha".into(),
            name("Matcha Gotcha", "Tegusto Matcha", "", "", ""),
        );
        apply_name_supplement(&mut into, supp);
        let inserted = into.get("matcha_gotcha").unwrap();
        assert_eq!(inserted.en, "Matcha Gotcha");
        assert_eq!(inserted.es, "Tegusto Matcha");
        // pt/it/fr default to the EN fallback so the user sees something
        // sensible in those locales while we wait for PokéAPI to add rows.
        assert_eq!(inserted.pt, "Matcha Gotcha");
        assert_eq!(inserted.it, "Matcha Gotcha");
        assert_eq!(inserted.fr, "Matcha Gotcha");
    }
}
