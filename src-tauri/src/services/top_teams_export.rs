use crate::domain::format::Format;
use crate::services::top_teams_service::{EvStatSpread, TopTeam, TopTeamMember, TopTeamsReport};
use chrono::Utc;

pub fn build_markdown(report: &TopTeamsReport, limit: usize, format: Format) -> String {
    let teams: Vec<&TopTeam> = report.teams.iter().take(limit).collect();
    let mut out = String::new();

    out.push_str(&format!(
        "# Top {} Teams — {}\n\n",
        teams.len(),
        format.label()
    ));
    out.push_str(&format!(
        "_Exported from VGC-Reporter v{} on {}_\n\n",
        env!("CARGO_PKG_VERSION"),
        Utc::now().format("%Y-%m-%d")
    ));

    let m = &report.meta;
    let mut sources = format!("Sources: {} tournaments analyzed", m.tournaments_analyzed);
    if let (Some(from), Some(to)) = (&m.from_date, &m.to_date) {
        sources.push_str(&format!(" ({} – {})", from, to));
    }
    out.push_str(&sources);
    out.push_str("\n\n---\n\n");

    for (idx, team) in teams.iter().enumerate() {
        out.push_str(&format_team_section(team, idx + 1));
        out.push_str("\n\n---\n\n");
    }

    out.trim_end_matches("\n---\n\n").trim_end().to_string() + "\n"
}

fn format_team_section(team: &TopTeam, position: usize) -> String {
    let mut out = String::new();

    let player = team.player.as_deref().unwrap_or("—");
    let country = team
        .country
        .as_ref()
        .filter(|c| c.len() == 2)
        .map(|c| format!(" ({})", c.to_uppercase()))
        .unwrap_or_default();
    out.push_str(&format!(
        "## #{} — {}{}\n\n",
        position,
        escape_md_inline(player),
        country
    ));

    let mut meta_parts: Vec<String> = Vec::new();
    meta_parts.push(format!(
        "**Tournament:** {}",
        escape_md_inline(&team.tournament)
    ));
    if let Some(p) = team.placing {
        meta_parts.push(format!("**Placing:** #{}", p));
    }
    if let Some(record) = &team.record {
        if !record.is_empty() {
            meta_parts.push(format!("**Record:** {}", escape_md_inline(record)));
        }
    }
    out.push_str(&meta_parts.join(" · "));
    out.push_str("\n\n```\n");
    out.push_str(&format_top_team_block(team));
    out.push_str("\n```");

    out
}

pub fn format_top_team_block(team: &TopTeam) -> String {
    team.members
        .iter()
        .filter(|m| !m.species.trim().is_empty())
        .map(format_top_team_member)
        .collect::<Vec<_>>()
        .join("\n\n")
}

pub fn format_top_team_member(m: &TopTeamMember) -> String {
    let mut out = String::new();

    match &m.item {
        Some(it) if !it.is_empty() => {
            out.push_str(&format!("{} @ {}\n", m.species, it));
        }
        _ => {
            out.push_str(&format!("{}\n", m.species));
        }
    }
    if let Some(ab) = &m.ability {
        if !ab.is_empty() {
            out.push_str(&format!("Ability: {}\n", ab));
        }
    }
    if let Some(level) = m.level {
        out.push_str(&format!("Level: {}\n", level));
    }
    if let Some(evs) = &m.evs {
        let line = format_evs(evs);
        if !line.is_empty() {
            out.push_str(&format!("EVs: {}\n", line));
        }
    }
    if let Some(nat) = &m.nature {
        if !nat.is_empty() {
            out.push_str(&format!("{} Nature\n", nat));
        }
    }
    if let Some(ivs) = &m.ivs {
        let line = format_ivs(ivs);
        if !line.is_empty() {
            out.push_str(&format!("IVs: {}\n", line));
        }
    }
    for mv in &m.moves {
        if !mv.is_empty() {
            out.push_str(&format!("- {}\n", mv));
        }
    }

    out.trim_end().to_string()
}

fn format_evs(e: &EvStatSpread) -> String {
    let mut parts: Vec<String> = Vec::new();
    if e.hp > 0 {
        parts.push(format!("{} HP", e.hp));
    }
    if e.atk > 0 {
        parts.push(format!("{} Atk", e.atk));
    }
    if e.def > 0 {
        parts.push(format!("{} Def", e.def));
    }
    if e.spa > 0 {
        parts.push(format!("{} SpA", e.spa));
    }
    if e.spd > 0 {
        parts.push(format!("{} SpD", e.spd));
    }
    if e.spe > 0 {
        parts.push(format!("{} Spe", e.spe));
    }
    parts.join(" / ")
}

fn format_ivs(e: &EvStatSpread) -> String {
    let mut parts: Vec<String> = Vec::new();
    if e.hp != 31 {
        parts.push(format!("{} HP", e.hp));
    }
    if e.atk != 31 {
        parts.push(format!("{} Atk", e.atk));
    }
    if e.def != 31 {
        parts.push(format!("{} Def", e.def));
    }
    if e.spa != 31 {
        parts.push(format!("{} SpA", e.spa));
    }
    if e.spd != 31 {
        parts.push(format!("{} SpD", e.spd));
    }
    if e.spe != 31 {
        parts.push(format!("{} Spe", e.spe));
    }
    parts.join(" / ")
}

fn escape_md_inline(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for ch in s.chars() {
        match ch {
            '\\' | '`' | '*' | '_' | '[' | ']' | '<' | '>' => {
                out.push('\\');
                out.push(ch);
            }
            _ => out.push(ch),
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::top_teams_service::{TopTeamsMeta, TopTeamsReport};

    fn full_member() -> TopTeamMember {
        TopTeamMember {
            species: "Incineroar".into(),
            sprite_url: "".into(),
            sprite_fallback_url: None,
            home_sprite_url: None,
            item: Some("Safety Goggles".into()),
            tera_type: Some("Ghost".into()),
            ability: Some("Intimidate".into()),
            nature: Some("Careful".into()),
            moves: vec![
                "Fake Out".into(),
                "Parting Shot".into(),
                "Knock Off".into(),
                "Will-O-Wisp".into(),
            ],
            level: Some(50),
            evs: Some(EvStatSpread {
                hp: 244,
                atk: 4,
                def: 4,
                spa: 0,
                spd: 180,
                spe: 76,
            }),
            ivs: None,
        }
    }

    #[test]
    fn format_member_full_canonical_order() {
        let out = format_top_team_member(&full_member());
        let lines: Vec<&str> = out.lines().collect();
        assert_eq!(lines[0], "Incineroar @ Safety Goggles");
        assert_eq!(lines[1], "Ability: Intimidate");
        assert_eq!(lines[2], "Level: 50");
        assert_eq!(lines[3], "EVs: 244 HP / 4 Atk / 4 Def / 180 SpD / 76 Spe");
        assert_eq!(lines[4], "Careful Nature");
        assert_eq!(lines[5], "- Fake Out");
        assert_eq!(lines[6], "- Parting Shot");
        assert_eq!(lines[7], "- Knock Off");
        assert_eq!(lines[8], "- Will-O-Wisp");
    }

    #[test]
    fn format_member_no_tera_emitted() {
        let m = full_member();
        let out = format_top_team_member(&m);
        assert!(
            !out.contains("Tera Type"),
            "tera type must be omitted from export, got:\n{}",
            out
        );
    }

    #[test]
    fn format_member_minimal() {
        let m = TopTeamMember {
            species: "Pikachu".into(),
            sprite_url: "".into(),
            sprite_fallback_url: None,
            home_sprite_url: None,
            item: None,
            tera_type: None,
            ability: None,
            nature: None,
            moves: vec!["Thunderbolt".into()],
            level: None,
            evs: None,
            ivs: None,
        };
        let out = format_top_team_member(&m);
        assert_eq!(out, "Pikachu\n- Thunderbolt");
    }

    #[test]
    fn evs_omitted_when_all_zero() {
        let mut m = full_member();
        m.evs = Some(EvStatSpread {
            hp: 0,
            atk: 0,
            def: 0,
            spa: 0,
            spd: 0,
            spe: 0,
        });
        let out = format_top_team_member(&m);
        assert!(!out.contains("EVs:"), "expected no EVs line, got:\n{}", out);
    }

    #[test]
    fn ivs_omitted_when_all_31_or_default() {
        let mut m = full_member();
        m.ivs = Some(EvStatSpread {
            hp: 31,
            atk: 31,
            def: 31,
            spa: 31,
            spd: 31,
            spe: 31,
        });
        let out = format_top_team_member(&m);
        assert!(!out.contains("IVs:"), "expected no IVs line, got:\n{}", out);

        let mut m2 = full_member();
        m2.ivs = Some(EvStatSpread {
            hp: 31,
            atk: 0,
            def: 31,
            spa: 31,
            spd: 31,
            spe: 31,
        });
        let out2 = format_top_team_member(&m2);
        assert!(
            out2.contains("IVs: 0 Atk"),
            "expected '0 Atk' IV line:\n{}",
            out2
        );
    }

    #[test]
    fn roundtrip_through_parse_team() {
        let out = format_top_team_member(&full_member());
        let parsed = crate::services::showdown_text::parse_team(&out).unwrap();
        let m = &parsed.members[0];
        assert_eq!(m.species, "Incineroar");
        assert_eq!(m.item.as_deref(), Some("Safety Goggles"));
        assert_eq!(m.ability.as_deref(), Some("Intimidate"));
        assert_eq!(m.evs.hp, 244);
        assert_eq!(m.evs.spd, 180);
        assert_eq!(m.evs.spe, 76);
        assert_eq!(
            m.moves,
            vec!["Fake Out", "Parting Shot", "Knock Off", "Will-O-Wisp"]
        );
    }

    #[test]
    fn build_markdown_header_and_separators() {
        let team = TopTeam {
            tournament: "Test Cup".into(),
            placing: Some(1),
            player: Some("Ash".into()),
            country: Some("jp".into()),
            record: Some("5-1".into()),
            members: vec![full_member()],
        };
        let report = TopTeamsReport {
            teams: vec![team.clone(), team.clone()],
            meta: TopTeamsMeta {
                tournaments_analyzed: 23,
                battles_analyzed: 0,
                source: "labmaus".into(),
                from_date: Some("2026-03-20".into()),
                to_date: Some("2026-04-19".into()),
            },
        };
        let md = build_markdown(&report, 2, Format::RegulationMA);
        assert!(md.starts_with("# Top 2 Teams"));
        assert!(md.contains("Regulation M-A"));
        assert!(md.contains("Sources: 23 tournaments analyzed (2026-03-20 – 2026-04-19)"));
        assert!(md.contains("## #1 — Ash (JP)"));
        assert!(md.contains("## #2 — Ash (JP)"));
        assert!(md.contains("**Tournament:** Test Cup"));
        assert!(md.contains("**Placing:** #1"));
        assert!(md.contains("**Record:** 5-1"));
        assert_eq!(
            md.matches("```").count(),
            4,
            "expected exactly 2 code-fence pairs, got:\n{}",
            md
        );
        assert_eq!(md.matches("\n---\n").count(), 2);
    }

    #[test]
    fn build_markdown_respects_limit() {
        let team = TopTeam {
            tournament: "T".into(),
            placing: Some(1),
            player: Some("P".into()),
            country: None,
            record: None,
            members: vec![full_member()],
        };
        let report = TopTeamsReport {
            teams: vec![team.clone(), team.clone(), team.clone()],
            meta: TopTeamsMeta {
                tournaments_analyzed: 0,
                battles_analyzed: 0,
                source: "x".into(),
                from_date: None,
                to_date: None,
            },
        };
        let md = build_markdown(&report, 2, Format::RegulationMA);
        assert!(md.contains("# Top 2 Teams"));
        assert_eq!(md.matches("## #").count(), 2);
    }

    #[test]
    fn escape_md_inline_handles_specials() {
        assert_eq!(escape_md_inline("a*b_c"), "a\\*b\\_c");
        assert_eq!(escape_md_inline("plain"), "plain");
    }
}
