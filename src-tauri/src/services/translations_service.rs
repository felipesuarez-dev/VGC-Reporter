use std::sync::Arc;

use tokio::sync::{Mutex, OnceCell};

use crate::adapters::{PokeApiClient, TranslationTable};
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
        let table = self.client.fetch_translation_table().await?;
        let _ = self.cache.set(table.clone());
        Ok(table)
    }
}
