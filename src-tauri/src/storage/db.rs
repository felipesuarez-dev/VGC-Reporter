use crate::error::AppError;
use r2d2_sqlite::SqliteConnectionManager;
use std::path::Path;

pub type DbPool = r2d2::Pool<SqliteConnectionManager>;

const MIGRATION_001: &str = include_str!("migrations/001_init.sql");
const MIGRATION_002: &str = include_str!("migrations/002_clear_pikalytics_cache.sql");

pub fn init_pool(db_path: &Path) -> Result<DbPool, AppError> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).map_err(AppError::from)?;
    }
    let manager = SqliteConnectionManager::file(db_path).with_init(|c| {
        c.pragma_update(None, "journal_mode", "WAL")?;
        c.pragma_update(None, "foreign_keys", "ON")?;
        Ok(())
    });
    let pool = r2d2::Pool::builder()
        .max_size(8)
        .build(manager)
        .map_err(|e| AppError::Internal(format!("db pool: {e}")))?;

    let conn = pool.get().map_err(|e| AppError::Internal(e.to_string()))?;
    conn.execute_batch(MIGRATION_001)?;
    conn.execute_batch(MIGRATION_002)?;
    Ok(pool)
}
