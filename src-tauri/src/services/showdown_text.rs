use crate::domain::evs::EvSpread;
use crate::domain::format::Format;
use crate::domain::ivs::IvSpread;
use crate::domain::nature::Nature;
use crate::domain::pokemon::PokemonType;
use crate::domain::team::{Gender, Team, TeamMember, DEFAULT_LEVEL};
use crate::error::AppError;
use chrono::Utc;

pub fn parse_team(text: &str) -> Result<Team, AppError> {
    let blocks = split_member_blocks(text);
    if blocks.is_empty() {
        return Err(AppError::Validation(
            "Showdown paste contains no members".into(),
        ));
    }
    let mut members: Vec<TeamMember> = blocks.into_iter().map(parse_member).collect();
    while members.len() < 6 {
        members.push(TeamMember::empty(""));
    }
    members.truncate(6);
    Ok(Team {
        id: None,
        name: "Imported team".to_string(),
        format: Format::RegulationMA,
        notes: None,
        members,
        created_at: Some(Utc::now()),
        updated_at: Some(Utc::now()),
    })
}

pub fn format_team(team: &Team) -> String {
    team.members
        .iter()
        .filter(|m| !m.species.trim().is_empty())
        .map(format_member)
        .collect::<Vec<_>>()
        .join("\n\n")
}

fn split_member_blocks(text: &str) -> Vec<Vec<String>> {
    let mut blocks: Vec<Vec<String>> = Vec::new();
    let mut current: Vec<String> = Vec::new();
    for raw in text.lines() {
        let line = raw.trim_end_matches(['\r']).to_string();
        if line.trim().is_empty() {
            if !current.is_empty() {
                blocks.push(std::mem::take(&mut current));
            }
        } else {
            current.push(line);
        }
    }
    if !current.is_empty() {
        blocks.push(current);
    }
    blocks
}

fn parse_member(lines: Vec<String>) -> TeamMember {
    let mut species = String::new();
    let mut nickname: Option<String> = None;
    let mut gender: Option<Gender> = None;
    let mut item: Option<String> = None;
    let mut ability: Option<String> = None;
    let mut nature: Option<Nature> = None;
    let mut tera_type: Option<PokemonType> = None;
    let mut moves: Vec<String> = Vec::new();
    let mut evs = EvSpread::default();
    let mut ivs = IvSpread::default();
    let mut level: u8 = DEFAULT_LEVEL;
    let mut shiny = false;

    let mut iter = lines.into_iter();
    if let Some(header) = iter.next() {
        let (sp, nk, gd, it) = parse_header(&header);
        species = sp;
        nickname = nk;
        gender = gd;
        item = it;
    }
    for raw in iter {
        let line = raw.trim();
        if line.is_empty() {
            continue;
        }
        if let Some(rest) = line.strip_prefix("Ability:") {
            ability = Some(rest.trim().to_string());
        } else if let Some(rest) = line.strip_prefix("Tera Type:") {
            tera_type = PokemonType::parse(rest.trim());
        } else if let Some(rest) = line.strip_prefix("EVs:") {
            evs = parse_evs(rest.trim());
        } else if let Some(rest) = line.strip_prefix("IVs:") {
            ivs = parse_ivs(rest.trim());
        } else if let Some(rest) = line.strip_prefix("Level:") {
            level = rest.trim().parse().unwrap_or(DEFAULT_LEVEL).clamp(1, 100);
        } else if let Some(rest) = line.strip_prefix("Shiny:") {
            let v = rest.trim().to_ascii_lowercase();
            shiny = matches!(v.as_str(), "yes" | "true" | "1");
        } else if let Some(rest) = line.strip_prefix("Gender:") {
            gender = parse_gender_word(rest.trim()).or(gender);
        } else if line.ends_with(" Nature") {
            let name = line.trim_end_matches(" Nature").trim();
            nature = parse_nature(name);
        } else if let Some(rest) = line.strip_prefix("- ") {
            if moves.len() < 4 {
                let mv = rest
                    .trim()
                    .split('/')
                    .next()
                    .unwrap_or("")
                    .trim()
                    .to_string();
                if !mv.is_empty() {
                    moves.push(mv);
                }
            }
        } else if line.starts_with("Happiness:")
            || line.starts_with("Gigantamax:")
            || line.starts_with("Dynamax Level:")
            || line.starts_with("Hidden Power:")
        {
            continue;
        }
    }

    TeamMember {
        species,
        item,
        ability,
        nature,
        tera_type,
        moves,
        evs,
        level,
        gender,
        shiny,
        nickname,
        ivs,
    }
}

/// Parse a Showdown header line into (species, nickname, gender, item).
/// Accepted shapes:
///   `Species @ Item`
///   `Species (M) @ Item`
///   `Nickname (Species) @ Item`
///   `Nickname (Species) (F) @ Item`
fn parse_header(line: &str) -> (String, Option<String>, Option<Gender>, Option<String>) {
    let (left, item) = match line.rsplit_once(" @ ") {
        Some((left, it)) => (left.trim().to_string(), Some(it.trim().to_string())),
        None => (line.trim().to_string(), None),
    };

    let mut working = left.as_str();
    let mut gender: Option<Gender> = None;
    // Trailing gender token in parentheses (the only one Showdown writes after the species)
    if let Some(idx) = working.rfind(" (") {
        let candidate = &working[idx + 2..];
        if let Some(inner) = candidate.strip_suffix(')') {
            if let Some(g) = parse_gender_token(inner) {
                gender = Some(g);
                working = working[..idx].trim_end();
            }
        }
    }

    // Optional nickname wrapping: `Nickname (Species)`.
    let (species, nickname) = match working.rfind(" (") {
        Some(idx) => {
            let head = &working[..idx];
            let tail = &working[idx + 2..];
            if let Some(inner) = tail.strip_suffix(')') {
                if !inner.is_empty() && !head.is_empty() {
                    (inner.trim().to_string(), Some(head.trim().to_string()))
                } else {
                    (working.to_string(), None)
                }
            } else {
                (working.to_string(), None)
            }
        }
        None => (working.to_string(), None),
    };

    (species, nickname, gender, item)
}

fn parse_gender_token(s: &str) -> Option<Gender> {
    match s.trim() {
        "M" => Some(Gender::Male),
        "F" => Some(Gender::Female),
        "N" => Some(Gender::Genderless),
        _ => None,
    }
}

fn parse_gender_word(s: &str) -> Option<Gender> {
    match s.trim().to_ascii_lowercase().as_str() {
        "m" | "male" => Some(Gender::Male),
        "f" | "female" => Some(Gender::Female),
        "n" | "genderless" | "none" => Some(Gender::Genderless),
        _ => None,
    }
}

fn parse_evs(s: &str) -> EvSpread {
    let mut out = EvSpread::default();
    for part in s.split('/') {
        let part = part.trim();
        let (amount, stat) = match part.split_once(' ') {
            Some(p) => p,
            None => continue,
        };
        let n: u16 = amount.parse().unwrap_or(0);
        match stat.trim() {
            "HP" => out.hp = n,
            "Atk" => out.atk = n,
            "Def" => out.def = n,
            "SpA" => out.spa = n,
            "SpD" => out.spd = n,
            "Spe" => out.spe = n,
            _ => {}
        }
    }
    out
}

fn parse_ivs(s: &str) -> IvSpread {
    // Showdown only writes IVs that differ from 31, so start at default 31.
    let mut out = IvSpread::default();
    for part in s.split('/') {
        let part = part.trim();
        let (amount, stat) = match part.split_once(' ') {
            Some(p) => p,
            None => continue,
        };
        let n: u8 = amount.parse().unwrap_or(31).min(31);
        match stat.trim() {
            "HP" => out.hp = n,
            "Atk" => out.atk = n,
            "Def" => out.def = n,
            "SpA" => out.spa = n,
            "SpD" => out.spd = n,
            "Spe" => out.spe = n,
            _ => {}
        }
    }
    out
}

fn parse_nature(name: &str) -> Option<Nature> {
    let n = name.trim();
    match n {
        "Hardy" => Some(Nature::Hardy),
        "Lonely" => Some(Nature::Lonely),
        "Brave" => Some(Nature::Brave),
        "Adamant" => Some(Nature::Adamant),
        "Naughty" => Some(Nature::Naughty),
        "Bold" => Some(Nature::Bold),
        "Docile" => Some(Nature::Docile),
        "Relaxed" => Some(Nature::Relaxed),
        "Impish" => Some(Nature::Impish),
        "Lax" => Some(Nature::Lax),
        "Timid" => Some(Nature::Timid),
        "Hasty" => Some(Nature::Hasty),
        "Serious" => Some(Nature::Serious),
        "Jolly" => Some(Nature::Jolly),
        "Naive" => Some(Nature::Naive),
        "Modest" => Some(Nature::Modest),
        "Mild" => Some(Nature::Mild),
        "Quiet" => Some(Nature::Quiet),
        "Bashful" => Some(Nature::Bashful),
        "Rash" => Some(Nature::Rash),
        "Calm" => Some(Nature::Calm),
        "Gentle" => Some(Nature::Gentle),
        "Sassy" => Some(Nature::Sassy),
        "Careful" => Some(Nature::Careful),
        "Quirky" => Some(Nature::Quirky),
        _ => None,
    }
}

fn format_member(m: &TeamMember) -> String {
    let mut out = String::new();
    let gender_suffix = match m.gender {
        Some(Gender::Male) => " (M)",
        Some(Gender::Female) => " (F)",
        _ => "",
    };
    let head_left = match (&m.nickname, m.species.as_str()) {
        (Some(n), sp) if !n.is_empty() && n != sp => format!("{} ({})", n, sp),
        _ => m.species.clone(),
    };
    let head = format!("{}{}", head_left, gender_suffix);
    match &m.item {
        Some(it) if !it.is_empty() => {
            out.push_str(&format!("{} @ {}\n", head, it));
        }
        _ => {
            out.push_str(&format!("{}\n", head));
        }
    }
    if let Some(ab) = &m.ability {
        if !ab.is_empty() {
            out.push_str(&format!("Ability: {}\n", ab));
        }
    }
    if m.level != DEFAULT_LEVEL {
        out.push_str(&format!("Level: {}\n", m.level));
    }
    if m.shiny {
        out.push_str("Shiny: Yes\n");
    }
    if let Some(tera) = &m.tera_type {
        out.push_str(&format!("Tera Type: {:?}\n", tera));
    }
    let evs_line = format_evs(&m.evs);
    if !evs_line.is_empty() {
        out.push_str(&format!("EVs: {}\n", evs_line));
    }
    if let Some(nat) = &m.nature {
        out.push_str(&format!("{:?} Nature\n", nat));
    }
    let ivs_line = format_ivs(&m.ivs);
    if !ivs_line.is_empty() {
        out.push_str(&format!("IVs: {}\n", ivs_line));
    }
    for mv in &m.moves {
        if !mv.is_empty() {
            out.push_str(&format!("- {}\n", mv));
        }
    }
    out.trim_end().to_string()
}

fn format_evs(e: &EvSpread) -> String {
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

fn format_ivs(i: &IvSpread) -> String {
    // Showdown only writes IVs that differ from 31.
    let mut parts: Vec<String> = Vec::new();
    if i.hp != 31 {
        parts.push(format!("{} HP", i.hp));
    }
    if i.atk != 31 {
        parts.push(format!("{} Atk", i.atk));
    }
    if i.def != 31 {
        parts.push(format!("{} Def", i.def));
    }
    if i.spa != 31 {
        parts.push(format!("{} SpA", i.spa));
    }
    if i.spd != 31 {
        parts.push(format!("{} SpD", i.spd));
    }
    if i.spe != 31 {
        parts.push(format!("{} Spe", i.spe));
    }
    parts.join(" / ")
}

#[cfg(test)]
mod tests {
    use super::*;

    const INCINEROAR: &str = "Incineroar @ Safety Goggles\nAbility: Intimidate\nLevel: 50\nTera Type: Ghost\nEVs: 244 HP / 4 Atk / 4 Def / 180 SpD / 76 Spe\nCareful Nature\n- Fake Out\n- Parting Shot\n- Knock Off\n- Will-O-Wisp";

    #[test]
    fn parse_single_member() {
        let t = parse_team(INCINEROAR).unwrap();
        let m = &t.members[0];
        assert_eq!(m.species, "Incineroar");
        assert_eq!(m.item.as_deref(), Some("Safety Goggles"));
        assert_eq!(m.ability.as_deref(), Some("Intimidate"));
        assert_eq!(m.tera_type, Some(PokemonType::Ghost));
        assert_eq!(m.nature, Some(Nature::Careful));
        assert_eq!(m.evs.hp, 244);
        assert_eq!(m.evs.spd, 180);
        assert_eq!(m.evs.spe, 76);
        assert_eq!(m.level, 50);
        assert!(!m.shiny);
        assert!(m.ivs.is_default());
        assert!(m.nickname.is_none());
        assert!(m.gender.is_none());
        assert_eq!(
            m.moves,
            vec!["Fake Out", "Parting Shot", "Knock Off", "Will-O-Wisp"]
        );
    }

    #[test]
    fn parse_header_with_nickname() {
        let (sp, nk, gd, it) = parse_header("Nicky (Incineroar) @ Safety Goggles");
        assert_eq!(sp, "Incineroar");
        assert_eq!(nk.as_deref(), Some("Nicky"));
        assert!(gd.is_none());
        assert_eq!(it.as_deref(), Some("Safety Goggles"));
    }

    #[test]
    fn parse_header_with_gender() {
        let (sp, nk, gd, it) = parse_header("Incineroar (M) @ Choice Band");
        assert_eq!(sp, "Incineroar");
        assert!(nk.is_none());
        assert_eq!(gd, Some(Gender::Male));
        assert_eq!(it.as_deref(), Some("Choice Band"));
    }

    #[test]
    fn parse_header_with_nickname_and_gender() {
        let (sp, nk, gd, it) =
            parse_header("Nicky (Incineroar) (F) @ Safety Goggles");
        assert_eq!(sp, "Incineroar");
        assert_eq!(nk.as_deref(), Some("Nicky"));
        assert_eq!(gd, Some(Gender::Female));
        assert_eq!(it.as_deref(), Some("Safety Goggles"));
    }

    #[test]
    fn parse_no_item() {
        let t = parse_team("Pikachu\nAbility: Static\n- Thunderbolt").unwrap();
        assert_eq!(t.members[0].species, "Pikachu");
        assert!(t.members[0].item.is_none());
    }

    #[test]
    fn parse_multi_member() {
        let text = format!(
            "{}\n\nRillaboom @ Loaded Dice\nAbility: Grassy Surge\nTera Type: Fire\nEVs: 252 Atk / 4 SpD / 252 Spe\nJolly Nature\n- Fake Out\n- Grassy Glide\n- Wood Hammer\n- U-turn",
            INCINEROAR
        );
        let t = parse_team(&text).unwrap();
        assert_eq!(t.members[0].species, "Incineroar");
        assert_eq!(t.members[1].species, "Rillaboom");
        assert_eq!(t.members[1].nature, Some(Nature::Jolly));
        assert_eq!(t.members[1].tera_type, Some(PokemonType::Fire));
    }

    #[test]
    fn pads_to_six_members() {
        let t = parse_team("Pikachu").unwrap();
        assert_eq!(t.members.len(), 6);
        assert_eq!(t.members[5].species, "");
    }

    #[test]
    fn round_trip_incineroar() {
        let t = parse_team(INCINEROAR).unwrap();
        let out = format_team(&t);
        assert!(out.contains("Incineroar @ Safety Goggles"));
        assert!(out.contains("Ability: Intimidate"));
        assert!(out.contains("Tera Type: Ghost"));
        assert!(out.contains("Careful Nature"));
        assert!(out.contains("244 HP"));
        assert!(out.contains("- Fake Out"));
    }

    #[test]
    fn empty_input_is_error() {
        assert!(parse_team("").is_err());
    }

    #[test]
    fn parse_evs_sparse() {
        let evs = parse_evs("252 HP / 4 Def / 252 Spe");
        assert_eq!(evs.hp, 252);
        assert_eq!(evs.def, 4);
        assert_eq!(evs.spe, 252);
        assert_eq!(evs.atk, 0);
    }

    #[test]
    fn parse_crlf_input() {
        let text = "Incineroar @ Safety Goggles\r\nAbility: Intimidate\r\n- Fake Out\r\n";
        let t = parse_team(text).unwrap();
        assert_eq!(t.members[0].species, "Incineroar");
        assert_eq!(t.members[0].moves, vec!["Fake Out"]);
    }

    #[test]
    fn round_trip_with_competitive_metadata() {
        let paste = "Nicky (Iron Hands) (M) @ Assault Vest\nAbility: Quark Drive\nLevel: 50\nShiny: Yes\nTera Type: Water\nEVs: 252 HP / 4 Atk / 252 SpD\nIVs: 0 Spe\nSassy Nature\n- Fake Out\n- Drain Punch\n- Thunder Punch\n- Wild Charge";
        let t = parse_team(paste).unwrap();
        let m = &t.members[0];
        assert_eq!(m.species, "Iron Hands");
        assert_eq!(m.nickname.as_deref(), Some("Nicky"));
        assert_eq!(m.gender, Some(Gender::Male));
        assert!(m.shiny);
        assert_eq!(m.level, 50);
        assert_eq!(m.ivs.spe, 0);
        assert_eq!(m.ivs.hp, 31);
        let out = format_team(&t);
        assert!(out.contains("Nicky (Iron Hands) (M) @ Assault Vest"));
        assert!(out.contains("Shiny: Yes"));
        assert!(out.contains("IVs: 0 Spe"));
        // Round-trip back: reparse should yield identical metadata.
        let t2 = parse_team(&out).unwrap();
        assert_eq!(t2.members[0].nickname.as_deref(), Some("Nicky"));
        assert_eq!(t2.members[0].gender, Some(Gender::Male));
        assert!(t2.members[0].shiny);
        assert_eq!(t2.members[0].ivs.spe, 0);
    }

    #[test]
    fn parse_level_non_default() {
        let paste = "Pikachu\nLevel: 80\n- Thunderbolt";
        let t = parse_team(paste).unwrap();
        assert_eq!(t.members[0].level, 80);
    }
}
