use crate::domain::evs::EvSpread;
use crate::domain::format::Format;
use crate::domain::nature::Nature;
use crate::domain::pokemon::PokemonType;
use crate::domain::team::{Team, TeamMember};
use crate::error::AppError;
use crate::storage::db::DbPool;
use chrono::{DateTime, Utc};
use rusqlite::{params, Connection};

pub struct TeamRepo {
    pool: DbPool,
}

impl TeamRepo {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    pub fn save(&self, team: &Team) -> Result<i64, AppError> {
        let mut conn = self.pool.get().map_err(|e| AppError::Internal(e.to_string()))?;
        let tx = conn.transaction()?;
        let now = Utc::now().to_rfc3339();
        let format_str = serde_json::to_string(&team.format)?
            .trim_matches('"')
            .to_string();

        let team_id = if let Some(id) = team.id {
            tx.execute(
                "UPDATE teams SET name=?1, format=?2, notes=?3, updated_at=?4 WHERE id=?5",
                params![team.name, format_str, team.notes, now, id],
            )?;
            tx.execute("DELETE FROM team_members WHERE team_id=?1", params![id])?;
            id
        } else {
            tx.execute(
                "INSERT INTO teams (name, format, notes, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4)",
                params![team.name, format_str, team.notes, now],
            )?;
            tx.last_insert_rowid()
        };

        for (idx, m) in team.members.iter().enumerate() {
            let slot = (idx + 1) as i64;
            let nature = m.nature.as_ref().map(|n| format!("{:?}", n));
            let tera = m.tera_type.as_ref().map(|t| format!("{:?}", t));
            let mv = |i: usize| m.moves.get(i).cloned();
            tx.execute(
                "INSERT INTO team_members (team_id, slot, species, item, ability, nature, tera_type,
                 move1, move2, move3, move4, ev_hp, ev_atk, ev_def, ev_spa, ev_spd, ev_spe)
                 VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17)",
                params![
                    team_id, slot, m.species, m.item, m.ability, nature, tera,
                    mv(0), mv(1), mv(2), mv(3),
                    m.evs.hp, m.evs.atk, m.evs.def, m.evs.spa, m.evs.spd, m.evs.spe
                ],
            )?;
        }

        tx.commit()?;
        Ok(team_id)
    }

    pub fn list(&self) -> Result<Vec<Team>, AppError> {
        let conn = self.pool.get().map_err(|e| AppError::Internal(e.to_string()))?;
        let mut stmt = conn.prepare(
            "SELECT id, name, format, notes, created_at, updated_at FROM teams ORDER BY updated_at DESC",
        )?;
        let mut rows = stmt.query([])?;
        let mut teams = Vec::new();
        while let Some(row) = rows.next()? {
            let id: i64 = row.get(0)?;
            let name: String = row.get(1)?;
            let format_str: String = row.get(2)?;
            let notes: Option<String> = row.get(3)?;
            let created_at_str: String = row.get(4)?;
            let updated_at_str: String = row.get(5)?;
            let format = parse_format(&format_str);
            let members = load_members(&conn, id)?;
            teams.push(Team {
                id: Some(id),
                name,
                format,
                notes,
                members,
                created_at: parse_dt(&created_at_str),
                updated_at: parse_dt(&updated_at_str),
            });
        }
        Ok(teams)
    }

    pub fn get(&self, id: i64) -> Result<Option<Team>, AppError> {
        let conn = self.pool.get().map_err(|e| AppError::Internal(e.to_string()))?;
        let mut stmt = conn.prepare(
            "SELECT id, name, format, notes, created_at, updated_at FROM teams WHERE id=?1",
        )?;
        let mut rows = stmt.query(params![id])?;
        if let Some(row) = rows.next()? {
            let id: i64 = row.get(0)?;
            let name: String = row.get(1)?;
            let format_str: String = row.get(2)?;
            let notes: Option<String> = row.get(3)?;
            let created_at_str: String = row.get(4)?;
            let updated_at_str: String = row.get(5)?;
            let members = load_members(&conn, id)?;
            Ok(Some(Team {
                id: Some(id),
                name,
                format: parse_format(&format_str),
                notes,
                members,
                created_at: parse_dt(&created_at_str),
                updated_at: parse_dt(&updated_at_str),
            }))
        } else {
            Ok(None)
        }
    }

    pub fn delete(&self, id: i64) -> Result<(), AppError> {
        let conn = self.pool.get().map_err(|e| AppError::Internal(e.to_string()))?;
        conn.execute("DELETE FROM teams WHERE id=?1", params![id])?;
        Ok(())
    }
}

fn parse_format(s: &str) -> Format {
    match s {
        "regulation-m-a" => Format::RegulationMA,
        _ => Format::RegulationMA,
    }
}

fn parse_dt(s: &str) -> Option<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(s)
        .ok()
        .map(|d| d.with_timezone(&Utc))
}

fn load_members(conn: &Connection, team_id: i64) -> Result<Vec<TeamMember>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT species, item, ability, nature, tera_type, move1, move2, move3, move4,
         ev_hp, ev_atk, ev_def, ev_spa, ev_spd, ev_spe
         FROM team_members WHERE team_id=?1 ORDER BY slot",
    )?;
    let mut rows = stmt.query(params![team_id])?;
    let mut members = Vec::new();
    while let Some(row) = rows.next()? {
        let species: String = row.get(0)?;
        let item: Option<String> = row.get(1)?;
        let ability: Option<String> = row.get(2)?;
        let nature_s: Option<String> = row.get(3)?;
        let tera_s: Option<String> = row.get(4)?;
        let m1: Option<String> = row.get(5)?;
        let m2: Option<String> = row.get(6)?;
        let m3: Option<String> = row.get(7)?;
        let m4: Option<String> = row.get(8)?;
        let moves = [m1, m2, m3, m4].into_iter().flatten().collect();
        let evs = EvSpread {
            hp: row.get::<_, i64>(9)? as u16,
            atk: row.get::<_, i64>(10)? as u16,
            def: row.get::<_, i64>(11)? as u16,
            spa: row.get::<_, i64>(12)? as u16,
            spd: row.get::<_, i64>(13)? as u16,
            spe: row.get::<_, i64>(14)? as u16,
        };
        members.push(TeamMember {
            species,
            item,
            ability,
            nature: nature_s.and_then(parse_nature),
            tera_type: tera_s.and_then(parse_type),
            moves,
            evs,
        });
    }
    Ok(members)
}

fn parse_nature(s: String) -> Option<Nature> {
    Nature::all().into_iter().find(|n| format!("{:?}", n) == s)
}

fn parse_type(s: String) -> Option<PokemonType> {
    PokemonType::parse(&s)
}
