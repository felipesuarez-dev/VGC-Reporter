use crate::error::AppError;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::Connection;
use std::path::Path;

pub type DbPool = r2d2::Pool<SqliteConnectionManager>;

const MIGRATION_001: &str = include_str!("migrations/001_init.sql");
const MIGRATION_002: &str = include_str!("migrations/002_clear_pikalytics_cache.sql");
const MIGRATION_003: &str = include_str!("migrations/003_invalidate_meta_and_labmaus_cache.sql");
const MIGRATION_004: &str = include_str!("migrations/004_basculegion_data_migration.sql");
const MIGRATION_005: &str = include_str!("migrations/005_team_member_competitive_fields.sql");
const MIGRATION_006: &str = include_str!("migrations/006_basculegion_revert_to_bare.sql");

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
    conn.execute_batch(MIGRATION_003)?;
    conn.execute_batch(MIGRATION_004)?;

    // Migration 005 is `ALTER TABLE ADD COLUMN`, which SQLite does NOT support
    // with `IF NOT EXISTS`. If the user already booted a prior version that
    // applied this migration, running it again throws "duplicate column name:
    // level" and the whole `init_pool` call returns Err — which aborts the
    // Tauri setup hook and makes the app open-and-close. Guard with a probe
    // on the first column the migration adds; if it's there, the rest must
    // be too (the migration is a single transaction block).
    if !column_exists(&conn, "team_members", "level")? {
        conn.execute_batch(MIGRATION_005)?;
    }

    // Migration 006 reverts the Basculegion-M mapping that 004 introduced;
    // it's UPDATE ... WHERE so naturally idempotent (Regla 2 del CLAUDE.md).
    conn.execute_batch(MIGRATION_006)?;

    Ok(pool)
}

/// Returns true when `table` has a column named `column`.
///
/// Used to make non-idempotent `ALTER TABLE ADD COLUMN` migrations safe on
/// subsequent boots. SQLite has no `ADD COLUMN IF NOT EXISTS`, so any future
/// migration that adds columns MUST follow the same pattern: read
/// `pragma_table_info` and only run the migration if the new column is
/// missing.
fn column_exists(conn: &Connection, table: &str, column: &str) -> Result<bool, AppError> {
    let sql = format!("PRAGMA table_info(\"{}\")", table);
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], |row| row.get::<_, String>(1))?;
    for row in rows {
        if row? == column {
            return Ok(true);
        }
    }
    Ok(false)
}
