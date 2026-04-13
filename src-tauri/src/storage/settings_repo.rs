use crate::error::AppError;
use crate::storage::db::DbPool;
use rusqlite::params;

pub struct SettingsRepo {
    pool: DbPool,
}

impl SettingsRepo {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    pub fn get(&self, key: &str) -> Result<Option<String>, AppError> {
        let conn = self.pool.get().map_err(|e| AppError::Internal(e.to_string()))?;
        let mut stmt = conn.prepare("SELECT value FROM settings WHERE key=?1")?;
        let mut rows = stmt.query(params![key])?;
        if let Some(row) = rows.next()? {
            Ok(Some(row.get(0)?))
        } else {
            Ok(None)
        }
    }

    pub fn set(&self, key: &str, value: &str) -> Result<(), AppError> {
        let conn = self.pool.get().map_err(|e| AppError::Internal(e.to_string()))?;
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            params![key, value],
        )?;
        Ok(())
    }

    pub fn all(&self) -> Result<std::collections::HashMap<String, String>, AppError> {
        let conn = self.pool.get().map_err(|e| AppError::Internal(e.to_string()))?;
        let mut stmt = conn.prepare("SELECT key, value FROM settings")?;
        let mut rows = stmt.query([])?;
        let mut out = std::collections::HashMap::new();
        while let Some(row) = rows.next()? {
            out.insert(row.get::<_, String>(0)?, row.get::<_, String>(1)?);
        }
        Ok(out)
    }
}
