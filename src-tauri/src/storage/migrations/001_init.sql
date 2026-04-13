PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS teams (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    format     TEXT    NOT NULL,
    notes      TEXT,
    created_at TEXT    NOT NULL,
    updated_at TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS team_members (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id   INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    slot      INTEGER NOT NULL CHECK (slot BETWEEN 1 AND 6),
    species   TEXT    NOT NULL,
    item      TEXT,
    ability   TEXT,
    nature    TEXT,
    tera_type TEXT,
    move1     TEXT,
    move2     TEXT,
    move3     TEXT,
    move4     TEXT,
    ev_hp     INTEGER NOT NULL DEFAULT 0,
    ev_atk    INTEGER NOT NULL DEFAULT 0,
    ev_def    INTEGER NOT NULL DEFAULT 0,
    ev_spa    INTEGER NOT NULL DEFAULT 0,
    ev_spd    INTEGER NOT NULL DEFAULT 0,
    ev_spe    INTEGER NOT NULL DEFAULT 0,
    UNIQUE (team_id, slot)
);

CREATE TABLE IF NOT EXISTS api_cache (
    url        TEXT PRIMARY KEY,
    payload    BLOB    NOT NULL,
    expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON api_cache (expires_at);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('language', 'es');
INSERT OR IGNORE INTO settings (key, value) VALUES ('active_format', 'regulation-m-a');
