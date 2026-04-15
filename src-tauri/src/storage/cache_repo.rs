use crate::error::AppError;
use crate::storage::db::DbPool;
use chrono::Utc;
use rusqlite::params;

pub struct CacheRepo {
    pool: DbPool,
}

impl CacheRepo {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    pub fn get(&self, url: &str) -> Result<Option<Vec<u8>>, AppError> {
        let conn = self
            .pool
            .get()
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let now = Utc::now().timestamp();
        let mut stmt =
            conn.prepare("SELECT payload FROM api_cache WHERE url=?1 AND expires_at > ?2")?;
        let mut rows = stmt.query(params![url, now])?;
        if let Some(row) = rows.next()? {
            let payload: Vec<u8> = row.get(0)?;
            Ok(Some(payload))
        } else {
            Ok(None)
        }
    }

    pub fn put(&self, url: &str, payload: &[u8], ttl_seconds: i64) -> Result<(), AppError> {
        let conn = self
            .pool
            .get()
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let expires = Utc::now().timestamp() + ttl_seconds;
        conn.execute(
            "INSERT INTO api_cache (url, payload, expires_at) VALUES (?1, ?2, ?3)
             ON CONFLICT(url) DO UPDATE SET payload=excluded.payload, expires_at=excluded.expires_at",
            params![url, payload, expires],
        )?;
        Ok(())
    }

    pub fn purge_expired(&self) -> Result<usize, AppError> {
        let conn = self
            .pool
            .get()
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let now = Utc::now().timestamp();
        let n = conn.execute("DELETE FROM api_cache WHERE expires_at <= ?1", params![now])?;
        Ok(n)
    }
}
