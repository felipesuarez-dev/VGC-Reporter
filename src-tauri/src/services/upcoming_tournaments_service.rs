use crate::adapters::sprite_resolver::{canonical_id, primary_sprite_url};
use crate::adapters::{
    ChampionshipEvent, ChampionshipsClient, LimitlessClient, LimitlessTournamentSummary,
    LimitlessUpcoming, OfficialEventClient, PokebaseClient, PokedataClient, PokedataEvent,
    PokedataTeam, PokedataTeamPokemon,
};
use crate::domain::champions::{
    DecklistPokemon, OfficialPlayerMatches, OfficialStanding, OfficialStandingsPage,
    OfficialTournamentDetail, OfficialTournamentMatch, OfficialTournamentTeam,
    OfficialTournamentTeams, TopCutMatch, TopCutPlayer, TopCutRound,
};
use crate::domain::{OfficialEventDetails, UpcomingTournament};
use crate::error::AppError;
use chrono::{Duration, NaiveDate, Utc};
use std::collections::HashMap;

const LIMITLESS_TOURNAMENT_URL: &str = "https://play.limitlesstcg.com/tournament";
const LIMITLESS_SOURCE: &str = "limitless";
const POKEDATA_SOURCE: &str = "play-pokemon";
const WINDOW_DAYS: i64 = 30;
/// Official majors are announced months ahead so the calendar can show the
/// whole season (LAIC, EUIC, NAIC, Worlds, Regionals). Local events keep the
/// tighter 30-day window.
const MAJOR_WINDOW_DAYS: i64 = 365;
/// Detail pages are heavier; only enrich events close enough that prizing and
/// results are likely to be published already.
const MAJOR_DETAIL_WINDOW_DAYS: i64 = 120;

#[derive(Clone)]
pub struct UpcomingTournamentsService {
    limitless: LimitlessClient,
    pokedata: PokedataClient,
    pokebase: PokebaseClient,
    official_event: OfficialEventClient,
    championships: ChampionshipsClient,
}

impl UpcomingTournamentsService {
    pub fn new(
        limitless: LimitlessClient,
        pokedata: PokedataClient,
        pokebase: PokebaseClient,
        official_event: OfficialEventClient,
        championships: ChampionshipsClient,
    ) -> Self {
        Self {
            limitless,
            pokedata,
            pokebase,
            official_event,
            championships,
        }
    }

    /// Extra fields from the official event page (organizer, clean address,
    /// price). Best effort: the official site sometimes serves an anti-bot page.
    pub async fn official_details(&self, url: &str) -> Result<OfficialEventDetails, AppError> {
        self.official_event.details(url).await
    }

    /// Official Masters standings for a Championship Series event. The feed
    /// publishes placement and match record but no decklists. When the official
    /// results are empty or late, the independent PokéData mirror fills the gap.
    pub async fn official_standings(
        &self,
        url: &str,
        start: u32,
        size: u32,
        name: Option<&str>,
        date: Option<NaiveDate>,
    ) -> Result<OfficialStandingsPage, AppError> {
        let official = self.championships.standings(url, start, size).await;
        match official {
            Ok(page) if page.results_available => Ok(page),
            Ok(page) => {
                if let Some(name) = name {
                    if let Ok(Some(fallback)) =
                        self.pokedata_standings_page(name, date, start, size).await
                    {
                        return Ok(fallback);
                    }
                }
                Ok(page)
            }
            Err(error) => {
                if let Some(name) = name {
                    if let Ok(Some(fallback)) =
                        self.pokedata_standings_page(name, date, start, size).await
                    {
                        return Ok(fallback);
                    }
                }
                Err(error)
            }
        }
    }

    /// Public top-cut teams from PokéBase for an official major. The official
    /// results feed has no decklists, so this is the enrichment layer.
    pub async fn official_teams(
        &self,
        name: &str,
        date: Option<NaiveDate>,
    ) -> Result<Option<OfficialTournamentTeams>, AppError> {
        let Some(tournament) = self.pokebase.find_tournament(name, date).await? else {
            return Ok(None);
        };
        let teams = self.pokebase.tournament_top8(&tournament.id).await?;
        Ok(Some(OfficialTournamentTeams {
            source: "pokebase".into(),
            source_url: tournament.url,
            tournament_name: tournament.name,
            tournament_date: tournament
                .date
                .or(date)
                .map(|value| value.format("%Y-%m-%d").to_string()),
            teams: teams
                .into_iter()
                .map(|team| OfficialTournamentTeam {
                    placing: team.placing,
                    placing_label: team.placing_label,
                    player_name: team.player_name,
                    country: team.country,
                    record: team.record,
                    pokemon: team
                        .pokemon
                        .into_iter()
                        .map(|pokemon| DecklistPokemon {
                            id: Some(canonical_id(&pokemon.name)),
                            name: pokemon.name.clone(),
                            item: pokemon.item,
                            ability: None,
                            tera_type: None,
                            moves: Vec::new(),
                            sprite_fallback_url: Some(primary_sprite_url(&pokemon.name)),
                            sprite_url: pokemon.sprite_url,
                            home_sprite_url: None,
                        })
                        .collect(),
                })
                .collect(),
        }))
    }

    /// Complete PokéData detail for an official event: top-cut bracket, teams
    /// and the per-player round history. The source sometimes omits the bracket
    /// but still publishes the final table and teams; both are preserved.
    pub async fn official_detail(
        &self,
        name: &str,
        date: Option<NaiveDate>,
    ) -> Result<Option<OfficialTournamentDetail>, AppError> {
        let (standings_result, top_cut_result) = tokio::join!(
            self.pokedata.standings(name, date),
            self.pokedata.top_cut(name, date)
        );
        let mut first_error = None;
        let standings = match standings_result {
            Ok(value) => value,
            Err(error) => {
                tracing::debug!(%error, "PokéData standings unavailable");
                first_error = Some(error);
                None
            }
        };
        let top_cut = match top_cut_result {
            Ok(value) => value,
            Err(error) => {
                tracing::warn!(%error, "PokéData top cut unavailable");
                first_error = Some(error);
                None
            }
        };
        if standings.is_none() && top_cut.is_none() {
            return match first_error {
                Some(error) => Err(error),
                None => Ok(None),
            };
        }

        let event_name = standings
            .as_ref()
            .map(|value| value.event_name.clone())
            .or_else(|| top_cut.as_ref().map(|value| value.event_name.clone()))
            .unwrap_or_default();
        let event_url = standings
            .as_ref()
            .map(|value| value.event_url.clone())
            .or_else(|| top_cut.as_ref().map(|value| value.event_url.clone()))
            .unwrap_or_default();
        let event_date = standings
            .as_ref()
            .and_then(|value| value.event_date)
            .or_else(|| top_cut.as_ref().and_then(|value| value.event_date));
        let divisions = top_cut
            .as_ref()
            .map(|value| {
                value
                    .divisions
                    .iter()
                    .map(|division| division.name.clone())
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();
        let teams_by_player = top_cut
            .as_ref()
            .map(|value| {
                value
                    .teams
                    .iter()
                    .map(|team| {
                        (
                            team.player_name.clone(),
                            team.pokemon
                                .iter()
                                .cloned()
                                .map(into_pokedata_pokemon)
                                .collect(),
                        )
                    })
                    .collect::<HashMap<_, Vec<_>>>()
            })
            .unwrap_or_default();
        let top_cut_teams = top_cut
            .as_ref()
            .map(|value| {
                let mut teams = value
                    .teams
                    .iter()
                    .filter(|team| team.placement.is_some_and(|place| place <= 8))
                    .cloned()
                    .map(into_pokedata_team)
                    .collect::<Vec<_>>();
                teams.sort_by_key(|team| team.placing.unwrap_or(u32::MAX));
                teams
            })
            .unwrap_or_default();
        let top_cut_rounds = top_cut
            .as_ref()
            .map(|value| {
                value
                    .rounds
                    .iter()
                    .map(|round| TopCutRound {
                        label: round.label.clone(),
                        matches: round
                            .matches
                            .iter()
                            .map(|m| TopCutMatch {
                                winner: TopCutPlayer {
                                    name: m.winner.name.clone(),
                                    seed: m.winner.seed,
                                    country: m.winner.country.clone(),
                                },
                                loser: TopCutPlayer {
                                    name: m.loser.name.clone(),
                                    seed: m.loser.seed,
                                    country: m.loser.country.clone(),
                                },
                            })
                            .collect(),
                    })
                    .collect()
            })
            .unwrap_or_default();

        Ok(Some(OfficialTournamentDetail {
            source: "pokedata".into(),
            source_url: event_url,
            tournament_name: event_name,
            tournament_date: event_date.map(|value| value.format("%Y-%m-%d").to_string()),
            swiss_rounds: standings.as_ref().and_then(|value| value.swiss_rounds),
            top_cut: top_cut_rounds,
            divisions,
            teams: top_cut_teams,
            players: standings
                .map(|standings| {
                    standings
                        .players
                        .into_iter()
                        .map(|player| {
                            let team = teams_by_player
                                .get(&player.player_name)
                                .cloned()
                                .unwrap_or_default();
                            OfficialPlayerMatches {
                                player_name: player.player_name,
                                country: player.country,
                                place: Some(player.place),
                                record: player.record,
                                matches: player
                                    .matches
                                    .into_iter()
                                    .map(|entry| OfficialTournamentMatch {
                                        round: entry.round,
                                        phase: entry.phase,
                                        opponent_name: entry.opponent_name,
                                        opponent_country: entry.opponent_country,
                                        opponent_place: entry.opponent_place,
                                        result: entry.result,
                                    })
                                    .collect(),
                                team,
                            }
                        })
                        .collect()
                })
                .unwrap_or_default(),
        }))
    }

    async fn pokedata_standings_page(
        &self,
        name: &str,
        date: Option<NaiveDate>,
        start: u32,
        size: u32,
    ) -> Result<Option<OfficialStandingsPage>, AppError> {
        let Some(standings) = self.pokedata.standings(name, date).await? else {
            return Ok(None);
        };
        let source_url = standings.event_url.clone();
        let total = standings.players.len() as u32;
        let standings = standings
            .players
            .into_iter()
            .skip(start as usize)
            .take(size as usize)
            .map(|player| OfficialStanding {
                place: Some(player.place),
                player_name: player.player_name,
                country: player.country,
                wins: player.wins,
                losses: player.losses,
                ties: player.ties,
                record: player.record,
            })
            .collect::<Vec<_>>();
        Ok(Some(OfficialStandingsPage {
            results_available: !standings.is_empty(),
            decklists_available: false,
            standings,
            total_count: Some(total),
            start,
            size,
            source: Some("pokedata".into()),
            source_url: Some(source_url),
        }))
    }

    pub async fn list_upcoming(
        &self,
        country: Option<String>,
    ) -> Result<Vec<UpcomingTournament>, AppError> {
        let now = Utc::now();
        let today = now.date_naive();
        let window_end = today + Duration::days(WINDOW_DAYS);
        let pokedata_start = today;

        let raw = self.limitless.list_all_vgc(200).await?;
        let mut upcoming: Vec<UpcomingTournament> = raw
            .into_iter()
            .filter_map(|t| to_upcoming(t, today, window_end))
            .collect();

        // The JSON API only exposes completed/ongoing tournaments. The public
        // upcoming table is the only source for what is announced next.
        match self.limitless.list_upcoming_vgc().await {
            Ok(events) => upcoming.extend(
                events
                    .into_iter()
                    .filter_map(|event| to_limitless_upcoming(event, now, window_end)),
            ),
            Err(error) => tracing::warn!(%error, "limitless upcoming table unavailable"),
        }

        let country = country
            .as_deref()
            .map(str::trim)
            .map(str::to_uppercase)
            .filter(|code| code.len() == 2 && code.chars().all(|c| c.is_ascii_alphabetic()));
        match self
            .pokedata
            .upcoming(country.as_deref(), pokedata_start, window_end)
            .await
        {
            Ok(events) => {
                upcoming.extend(
                    events
                        .into_iter()
                        .filter_map(|event| to_pokedata_upcoming(event, today, window_end)),
                );
            }
            Err(error) => tracing::warn!(
                country = country.as_deref().unwrap_or("all"),
                %error,
                "official event locator unavailable; showing online tournaments only"
            ),
        }

        // Internationals, Regionals, Specials and Worlds live on the official
        // Championship Series calendar, not on the local event locator.
        match self.championships.list(false).await {
            Ok(events) => {
                let major_window_end = today + Duration::days(MAJOR_WINDOW_DAYS);
                // Majors are global: the country/city filters belong to the
                // local event list and must never hide LAIC/NAIC/etc.
                let mut majors = events
                    .into_iter()
                    .filter(|event| event.end_date >= today && event.start_date <= major_window_end)
                    .collect::<Vec<_>>();
                let enrichments = majors
                    .iter_mut()
                    .filter(|event| {
                        event.start_date <= today + Duration::days(MAJOR_DETAIL_WINDOW_DAYS)
                    })
                    .map(|event| self.championships.enrich(event));
                futures::future::join_all(enrichments).await;
                upcoming.extend(majors.into_iter().map(to_official_major));
            }
            Err(error) => tracing::warn!(%error, "official major calendar unavailable"),
        }

        upcoming.sort_by(|a, b| {
            a.date
                .cmp(&b.date)
                .then_with(|| a.time.cmp(&b.time))
                .then_with(|| a.name.cmp(&b.name))
        });
        upcoming.dedup_by(|a, b| a.id == b.id);
        upcoming.truncate(200);
        tracing::info!(
            kept = upcoming.len(),
            today = %today,
            window_end = %window_end,
            window_days = WINDOW_DAYS,
            "upcoming tournaments filtered"
        );
        Ok(upcoming)
    }
}

fn to_upcoming(
    t: LimitlessTournamentSummary,
    today: NaiveDate,
    window_end: NaiveDate,
) -> Option<UpcomingTournament> {
    let raw_date = t.date.as_deref()?;
    let parsed = parse_date(raw_date)?;
    // Keep today's events: a tournament at 20:00 is still upcoming at noon.
    if parsed < today || parsed > window_end {
        return None;
    }
    Some(UpcomingTournament {
        id: t.id.clone(),
        name: t.name,
        date: parsed.format("%Y-%m-%d").to_string(),
        url: format!("{}/{}", LIMITLESS_TOURNAMENT_URL, t.id),
        region: t.format,
        players: t.players,
        champion_name: None,
        champion_country: None,
        source: LIMITLESS_SOURCE.to_string(),
        end_date: None,
        tier: Some("community".to_string()),
        prize_pool: None,
        time: None,
        kind: None,
        city: None,
        country: None,
        venue: None,
        street_address: None,
        state: None,
        postal_code: None,
        latitude: None,
        longitude: None,
        contact_email: None,
        contact_phone: None,
        details: None,
        registration_start: None,
        registration_end: None,
        admission: None,
        starts_at: None,
        registrations: None,
        event_website: None,
        third_party_registration_website: None,
    })
}

fn to_limitless_upcoming(
    event: LimitlessUpcoming,
    now: chrono::DateTime<Utc>,
    window_end: NaiveDate,
) -> Option<UpcomingTournament> {
    let parsed = chrono::DateTime::parse_from_rfc3339(&event.starts_at)
        .ok()?
        .with_timezone(&Utc);
    if parsed < now || parsed.date_naive() > window_end {
        return None;
    }
    Some(UpcomingTournament {
        id: event.id,
        name: event.name,
        date: parsed.date_naive().format("%Y-%m-%d").to_string(),
        url: event.url,
        region: event.region,
        players: None,
        champion_name: None,
        champion_country: None,
        source: LIMITLESS_SOURCE.to_string(),
        end_date: None,
        tier: Some("community".to_string()),
        prize_pool: None,
        time: Some(parsed.format("%H:%M").to_string()),
        kind: Some("Online".to_string()),
        city: None,
        country: None,
        venue: None,
        street_address: None,
        state: None,
        postal_code: None,
        latitude: None,
        longitude: None,
        contact_email: None,
        contact_phone: None,
        details: None,
        registration_start: None,
        registration_end: None,
        admission: None,
        starts_at: Some(event.starts_at),
        registrations: event.registrations,
        event_website: None,
        third_party_registration_website: None,
    })
}

fn to_pokedata_upcoming(
    event: PokedataEvent,
    today: NaiveDate,
    window_end: NaiveDate,
) -> Option<UpcomingTournament> {
    let parsed = NaiveDate::parse_from_str(&event.date, "%Y-%m-%d").ok()?;
    if parsed < today || parsed > window_end {
        return None;
    }
    Some(UpcomingTournament {
        id: format!("{POKEDATA_SOURCE}-{}", event.id),
        name: event.name,
        date: event.date,
        url: event
            .url
            .unwrap_or_else(|| "https://events.pokemon.com/en-us/events?filters=vg".to_string()),
        region: None,
        players: None,
        champion_name: None,
        champion_country: None,
        source: POKEDATA_SOURCE.to_string(),
        end_date: None,
        tier: Some("local".to_string()),
        prize_pool: None,
        time: event.time,
        kind: event.kind,
        city: event.city,
        country: event.country,
        venue: event.venue,
        street_address: event.street_address,
        state: event.state,
        postal_code: event.postal_code,
        latitude: event.latitude,
        longitude: event.longitude,
        contact_email: event.contact_email,
        contact_phone: event.contact_phone,
        details: event.details,
        registration_start: event.registration_start,
        registration_end: event.registration_end,
        admission: event.admission,
        starts_at: None,
        registrations: None,
        event_website: event.event_website,
        third_party_registration_website: event.third_party_registration_website,
    })
}

fn to_official_major(event: ChampionshipEvent) -> UpcomingTournament {
    let url = event.url;
    UpcomingTournament {
        id: format!("official-{}", event.id),
        name: event.name,
        date: event.start_date.to_string(),
        url: url.clone(),
        region: None,
        players: event.players,
        champion_name: event.winner_name,
        champion_country: event.winner_country,
        source: POKEDATA_SOURCE.to_string(),
        end_date: Some(event.end_date.to_string()),
        tier: Some(event.type_code),
        prize_pool: event.prize_pool,
        time: None,
        kind: None,
        city: event.city,
        country: event.country,
        venue: None,
        street_address: None,
        state: None,
        postal_code: None,
        latitude: None,
        longitude: None,
        contact_email: None,
        contact_phone: None,
        details: None,
        registration_start: None,
        registration_end: None,
        admission: None,
        starts_at: None,
        registrations: None,
        event_website: Some(url),
        third_party_registration_website: None,
    }
}

fn into_pokedata_pokemon(pokemon: PokedataTeamPokemon) -> DecklistPokemon {
    let display = pokemon.name;
    DecklistPokemon {
        id: Some(canonical_id(&display)),
        name: display.clone(),
        item: pokemon.item,
        ability: None,
        tera_type: None,
        moves: pokemon.moves,
        sprite_url: pokemon.sprite_url,
        sprite_fallback_url: Some(primary_sprite_url(&display)),
        home_sprite_url: None,
    }
}

fn into_pokedata_team(team: PokedataTeam) -> OfficialTournamentTeam {
    OfficialTournamentTeam {
        placing: team.placement,
        placing_label: team.placement.map(placing_label),
        player_name: team.player_name,
        country: team.country,
        record: team.record,
        pokemon: team
            .pokemon
            .into_iter()
            .map(into_pokedata_pokemon)
            .collect(),
    }
}

fn placing_label(place: u32) -> String {
    match place {
        1 => "1st".to_string(),
        2 => "2nd".to_string(),
        3 => "3rd".to_string(),
        value => format!("{value}th"),
    }
}

fn parse_date(raw: &str) -> Option<NaiveDate> {
    if let Ok(d) = NaiveDate::parse_from_str(raw, "%Y-%m-%d") {
        return Some(d);
    }
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(raw) {
        return Some(dt.date_naive());
    }
    if let Ok(d) = NaiveDate::parse_from_str(raw, "%d/%m/%Y") {
        return Some(d);
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_date_accepts_multiple_formats() {
        assert!(parse_date("2026-05-01").is_some());
        assert!(parse_date("2026-05-01T18:00:00Z").is_some());
        assert!(parse_date("01/05/2026").is_some());
        assert!(parse_date("nonsense").is_none());
    }

    #[test]
    fn to_upcoming_filters_past_and_far_future() {
        let today = NaiveDate::from_ymd_opt(2026, 4, 17).unwrap();
        let window = today + Duration::days(14);
        let mk = |id: &str, date: Option<&str>| LimitlessTournamentSummary {
            id: id.into(),
            name: format!("Event {}", id),
            date: date.map(str::to_string),
            players: Some(80),
            format: Some("M-A".into()),
            organizer_id: None,
            game: None,
        };
        assert!(to_upcoming(mk("past", Some("2026-04-10")), today, window).is_none());
        assert!(to_upcoming(mk("far", Some("2026-06-01")), today, window).is_none());
        assert!(to_upcoming(mk("none", None), today, window).is_none());
        assert!(to_upcoming(mk("next", Some("2026-04-25")), today, window).is_some());
        // Today's events stay visible: a tournament at 20:00 is still
        // upcoming at noon.
        assert!(to_upcoming(mk("today", Some("2026-04-17")), today, window).is_some());
        assert!(to_upcoming(mk("tomorrow", Some("2026-04-18")), today, window).is_some());
    }

    #[test]
    fn maps_an_official_major_with_range_tier_and_prize() {
        let event = ChampionshipEvent {
            id: "2027-sao-paulo".into(),
            name: "2027 Pokémon Latin America International Championships".into(),
            url: "https://championships.pokemon.com/en-us/events/internationals/2027/sao-paulo"
                .into(),
            location: "São Paulo, Brazil".into(),
            city: Some("São Paulo".into()),
            country: Some("BR".into()),
            type_code: "international".into(),
            region: Some("latinamerica".into()),
            start_date: NaiveDate::from_ymd_opt(2026, 11, 20).unwrap(),
            end_date: NaiveDate::from_ymd_opt(2026, 11, 22).unwrap(),
            prize_pool: Some("$500,000 USD".into()),
            winner_name: None,
            winner_country: None,
            players: None,
        };
        let mapped = to_official_major(event);
        assert_eq!(mapped.id, "official-2027-sao-paulo");
        assert_eq!(mapped.source, "play-pokemon");
        assert_eq!(mapped.date, "2026-11-20");
        assert_eq!(mapped.end_date.as_deref(), Some("2026-11-22"));
        assert_eq!(mapped.tier.as_deref(), Some("international"));
        assert_eq!(mapped.prize_pool.as_deref(), Some("$500,000 USD"));
        assert_eq!(mapped.country.as_deref(), Some("BR"));
        assert_eq!(mapped.city.as_deref(), Some("São Paulo"));
    }

    #[test]
    fn maps_a_local_event_to_the_shared_shape() {
        let today = NaiveDate::from_ymd_opt(2026, 11, 21).unwrap();
        let window = today + Duration::days(30);
        let event = PokedataEvent {
            id: "abc".into(),
            name: "League Challenge Spells VGC".into(),
            date: "2026-11-28".into(),
            time: Some("15:00:00".into()),
            kind: Some("League Challenge".into()),
            city: Some("Vina del Mar".into()),
            country: Some("CL".into()),
            venue: Some("SPELLS TCG".into()),
            url: Some("https://www.pokemon.com/x".into()),
            street_address: Some("AV. LIBERTAD 123".into()),
            state: Some("Valparaiso".into()),
            postal_code: Some("2520000".into()),
            latitude: Some(-33.0245),
            longitude: Some(-71.5518),
            contact_email: Some("events@spells.cl".into()),
            contact_phone: None,
            details: Some("Registration opens at 14:30.".into()),
            registration_start: Some("2026-11-28 14:30:00".into()),
            registration_end: Some("2026-11-28 15:00:00".into()),
            admission: Some("5000 CLP".into()),
            event_website: None,
            third_party_registration_website: None,
        };
        let mapped = to_pokedata_upcoming(event, today, window).unwrap();
        assert_eq!(mapped.source, "play-pokemon");
        assert_eq!(mapped.country.as_deref(), Some("CL"));
        assert_eq!(mapped.city.as_deref(), Some("Vina del Mar"));
        assert_eq!(mapped.kind.as_deref(), Some("League Challenge"));
        assert_eq!(mapped.latitude, Some(-33.0245));
        assert_eq!(mapped.admission.as_deref(), Some("5000 CLP"));
    }
}
