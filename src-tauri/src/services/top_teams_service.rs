use crate::adapters::labmaus_client::LabmausDiscoverTeam;
use crate::adapters::sprite_resolver::canonical_display_name;
use crate::adapters::{LabmausClient, LimitlessClient, PokepasteClient, ShowdownEntry, StatSpread};
use crate::config;
use crate::domain::format::Format;
use crate::error::AppError;
use crate::services::date_window::{effective_range, DateRange};
use crate::services::pokedex_service::PokedexService;
use crate::services::usage_aggregator::prettify_public;
use crate::storage::CacheRepo;
use futures::stream::{self, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::sync::Arc;
use ts_rs::TS;

const POKEPASTE_CONCURRENCY: usize = 16;

#[derive(Clone)]
pub struct TopTeamsService {
    labmaus: LabmausClient,
    pokepaste: PokepasteClient,
    limitless: LimitlessClient,
    pokebase: crate::adapters::PokebaseClient,
    pokedex: Arc<PokedexService>,
    cache: Arc<CacheRepo>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct TopTeam {
    pub tournament: String,
    pub placing: Option<u32>,
    pub player: Option<String>,
    #[serde(default)]
    pub country: Option<String>,
    pub record: Option<String>,
    pub members: Vec<TopTeamMember>,
    #[serde(default)]
    pub provider: Option<String>,
    #[serde(default)]
    pub community: bool,
    #[serde(default)]
    pub source_url: Option<String>,
    #[serde(default)]
    pub shared_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct TopTeamsMeta {
    pub tournaments_analyzed: u32,
    pub battles_analyzed: u32,
    pub source: String,
    #[serde(default)]
    pub from_date: Option<String>,
    #[serde(default)]
    pub to_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct TopTeamsReport {
    pub teams: Vec<TopTeam>,
    pub meta: TopTeamsMeta,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct TopTeamMember {
    pub species: String,
    pub sprite_url: String,
    #[serde(default)]
    pub sprite_fallback_url: Option<String>,
    #[serde(default)]
    pub home_sprite_url: Option<String>,
    pub item: Option<String>,
    pub tera_type: Option<String>,
    #[serde(default)]
    pub ability: Option<String>,
    #[serde(default)]
    pub nature: Option<String>,
    #[serde(default)]
    pub moves: Vec<String>,
    #[serde(default)]
    pub level: Option<u8>,
    #[serde(default)]
    pub evs: Option<EvStatSpread>,
    #[serde(default)]
    pub ivs: Option<EvStatSpread>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct EvStatSpread {
    pub hp: u8,
    pub atk: u8,
    pub def: u8,
    pub spa: u8,
    pub spd: u8,
    pub spe: u8,
}

impl From<StatSpread> for EvStatSpread {
    fn from(s: StatSpread) -> Self {
        Self {
            hp: s.hp,
            atk: s.atk,
            def: s.def,
            spa: s.spa,
            spd: s.spd,
            spe: s.spe,
        }
    }
}

impl TopTeamsService {
    pub fn new(
        labmaus: LabmausClient,
        pokepaste: PokepasteClient,
        limitless: LimitlessClient,
        pokebase: crate::adapters::PokebaseClient,
        pokedex: Arc<PokedexService>,
        cache: Arc<CacheRepo>,
    ) -> Self {
        Self {
            labmaus,
            pokepaste,
            limitless,
            pokebase,
            pokedex,
            cache,
        }
    }

    pub async fn get_top_teams_report(
        &self,
        format: Format,
        limit: usize,
        source: Option<String>,
        requested_range: Option<DateRange>,
    ) -> Result<TopTeamsReport, AppError> {
        let range = effective_range(&format, requested_range);
        let (from, to) = range.strings();
        let source = source
            .as_deref()
            .map(|value| value.trim().to_ascii_lowercase())
            .filter(|value| !value.is_empty());
        let key = format!(
            "top-teams::v13::{}::{}::{}::{from}::{to}",
            format.cache_id(),
            limit,
            source.as_deref().unwrap_or("all")
        );
        if let Some(bytes) = self.cache.get(&key)? {
            if let Ok(report) = serde_json::from_slice::<TopTeamsReport>(&bytes) {
                return Ok(report);
            }
        }

        // PRIMARY: labmaus discover_teams + pokepast.es. When the user pins
        // Limitless we skip this path entirely; when a source that doesn't
        // publish teams is pinned we return an honest empty report.
        if source.as_deref().is_none() || source.as_deref() == Some("labmaus") {
            if let Some(regulation) = format.default_labmaus_name() {
                match self
                    .build_from_labmaus(
                        format.clone(),
                        &regulation,
                        limit,
                        (from.clone(), to.clone()),
                    )
                    .await
                {
                    Ok(report) if !report.teams.is_empty() => {
                        tracing::info!(
                            source = "labmaus",
                            teams = report.teams.len(),
                            "top teams report"
                        );
                        let bytes = serde_json::to_vec(&report)?;
                        self.cache.put(&key, &bytes, config::TTL_META_SNAPSHOT)?;
                        return Ok(report);
                    }
                    Ok(_) => {
                        tracing::warn!("labmaus returned no teams, falling back to limitless")
                    }
                    Err(e) => {
                        tracing::warn!(error = ?e, "labmaus failed, falling back to limitless")
                    }
                }
            }
        }

        if source.as_deref() == Some("pokebase") {
            let report = self.build_from_pokebase(limit).await?;
            let bytes = serde_json::to_vec(&report)?;
            self.cache.put(&key, &bytes, config::TTL_META_SNAPSHOT)?;
            return Ok(report);
        }

        if source.as_deref().is_some()
            && source.as_deref() != Some("labmaus")
            && source.as_deref() != Some("limitless")
        {
            return Ok(TopTeamsReport {
                teams: Vec::new(),
                meta: TopTeamsMeta {
                    tournaments_analyzed: 0,
                    battles_analyzed: 0,
                    source: format!(
                        "{} does not publish teams",
                        source.as_deref().unwrap_or("source")
                    ),
                    from_date: Some(from),
                    to_date: Some(to),
                },
            });
        }

        let report = self.build_from_limitless(format, limit, (from, to)).await?;
        // Don't cache an empty report - a transient miss would otherwise stick
        // for the full TTL and keep the page blank after the source recovers.
        if !report.teams.is_empty() {
            let bytes = serde_json::to_vec(&report)?;
            self.cache.put(&key, &bytes, config::TTL_META_SNAPSHOT)?;
        }
        Ok(report)
    }

    async fn build_from_labmaus(
        &self,
        _format: Format,
        regulation: &str,
        limit: usize,
        (from, to): (String, String),
    ) -> Result<TopTeamsReport, AppError> {
        let teams = self
            .labmaus
            .get_discover_teams(&from, &to, regulation)
            .await?;
        let total = teams.len() as u32;
        let selected: Vec<LabmausDiscoverTeam> = teams.into_iter().take(limit).collect();

        let fetches: Vec<_> = selected
            .iter()
            .map(|t| {
                let client = self.pokepaste.clone();
                let url = t.team_url.clone();
                async move { client.get_team(&url).await.unwrap_or_default() }
            })
            .collect();
        let pastes = stream::iter(fetches)
            .buffer_unordered(POKEPASTE_CONCURRENCY)
            .collect::<Vec<_>>()
            .await;

        let mut out = Vec::with_capacity(selected.len());
        for (team, paste) in selected.into_iter().zip(pastes) {
            if let Some(built) = self.build_top_team(&team, &paste).await {
                out.push(built);
            }
        }

        let tournaments_analyzed = out
            .iter()
            .map(|t| t.tournament.as_str())
            .collect::<HashSet<_>>()
            .len() as u32;

        Ok(TopTeamsReport {
            teams: out,
            meta: TopTeamsMeta {
                tournaments_analyzed,
                battles_analyzed: total,
                source: "labmaus.net + pokepast.es".into(),
                from_date: Some(from),
                to_date: Some(to),
            },
        })
    }

    async fn build_top_team(
        &self,
        team: &LabmausDiscoverTeam,
        paste: &[ShowdownEntry],
    ) -> Option<TopTeam> {
        let members = if !paste.is_empty() {
            let mut rows = Vec::with_capacity(paste.len());
            for entry in paste {
                if let Some(m) = self.member_from_paste(entry).await {
                    rows.push(m);
                }
            }
            rows
        } else {
            let mut rows = Vec::with_capacity(team.pokemon_names.len());
            for raw in &team.pokemon_names {
                if let Some(m) = self.member_from_name(raw).await {
                    rows.push(m);
                }
            }
            rows
        };

        if members.len() < 3 {
            return None;
        }

        let tournament = team
            .tournament_name
            .clone()
            .unwrap_or_else(|| "Labmaus".to_string());
        Some(TopTeam {
            tournament,
            placing: team.placement,
            player: Some(team.player.clone()),
            country: team.country.clone(),
            record: team.record.clone(),
            members,
            provider: Some("labmaus".into()),
            community: false,
            source_url: None,
            shared_at: None,
        })
    }

    async fn member_from_paste(&self, entry: &ShowdownEntry) -> Option<TopTeamMember> {
        if entry.species.is_empty() {
            return None;
        }
        let canonical = canonical_display_name(&entry.species);
        let (sprite_url, sprite_fallback_url, home_sprite_url) =
            self.pokedex.sprite_urls_for(&canonical).await;
        Some(TopTeamMember {
            species: canonical,
            sprite_url,
            sprite_fallback_url,
            home_sprite_url,
            item: entry.item.clone(),
            tera_type: entry.tera_type.clone(),
            ability: entry.ability.clone(),
            nature: entry.nature.clone(),
            moves: entry.moves.clone(),
            level: entry.level,
            evs: entry.evs.map(Into::into),
            ivs: entry.ivs.map(Into::into),
        })
    }

    async fn member_from_name(&self, raw: &str) -> Option<TopTeamMember> {
        let canonical = canonical_display_name(raw);
        if canonical.is_empty() {
            return None;
        }
        let (sprite_url, sprite_fallback_url, home_sprite_url) =
            self.pokedex.sprite_urls_for(&canonical).await;
        Some(TopTeamMember {
            species: canonical,
            sprite_url,
            sprite_fallback_url,
            home_sprite_url,
            item: None,
            tera_type: None,
            ability: None,
            nature: None,
            moves: Vec::new(),
            level: None,
            evs: None,
            ivs: None,
        })
    }

    async fn build_from_limitless(
        &self,
        format: Format,
        limit: usize,
        (from, to): (String, String),
    ) -> Result<TopTeamsReport, AppError> {
        let parse = |value: &str| chrono::NaiveDate::parse_from_str(value, "%Y-%m-%d").ok();
        let range = match (parse(&from), parse(&to)) {
            (Some(from), Some(to)) => Some((from, to)),
            _ => None,
        };
        let tournaments = self
            .limitless
            .list_tournaments_in_range(format, range, 10)
            .await
            .unwrap_or_default();
        let tournaments_analyzed = tournaments.len() as u32;
        let mut dates: Vec<String> = tournaments.iter().filter_map(|t| t.date.clone()).collect();
        dates.sort();
        let from_date = dates.first().cloned();
        let to_date = dates.last().cloned();

        let mut out = Vec::new();
        let mut battles_analyzed: u32 = 0;
        for t in tournaments {
            let standings = self
                .limitless
                .get_standings(&t.id)
                .await
                .unwrap_or_default();
            for s in standings.into_iter().take(8) {
                battles_analyzed += 1;
                let Some(deck) = s.decklist else { continue };
                if deck.is_empty() {
                    continue;
                }
                let mut members = Vec::new();
                for e in deck {
                    let Some(raw) = e.species_name().map(|s| s.to_string()) else {
                        continue;
                    };
                    let species = canonical_display_name(&raw);
                    if species.is_empty() {
                        continue;
                    }
                    let (sprite_url, sprite_fallback_url, home_sprite_url) =
                        self.pokedex.sprite_urls_for(&species).await;
                    members.push(TopTeamMember {
                        sprite_url,
                        sprite_fallback_url,
                        home_sprite_url,
                        species,
                        item: e.item.clone(),
                        tera_type: e.tera_value().map(prettify_public),
                        ability: e.ability.clone(),
                        nature: e.nature.clone(),
                        moves: e.moves.clone().unwrap_or_default(),
                        level: None,
                        evs: None,
                        ivs: None,
                    });
                }
                if members.len() < 3 {
                    tracing::warn!(
                        tournament = %t.id,
                        members = members.len(),
                        "skipping team: fewer than 3 valid members after normalization",
                    );
                    continue;
                }
                out.push(TopTeam {
                    tournament: t.name.clone(),
                    placing: s.placing,
                    player: s.name.clone(),
                    country: s.country.clone(),
                    record: s.record.as_ref().map(|r| r.display()),
                    members,
                    provider: Some("limitless".into()),
                    community: false,
                    source_url: None,
                    shared_at: None,
                });
                if out.len() >= limit {
                    break;
                }
            }
            if out.len() >= limit {
                break;
            }
        }

        Ok(TopTeamsReport {
            teams: out,
            meta: TopTeamsMeta {
                tournaments_analyzed,
                battles_analyzed,
                source: "Limitless VGC".into(),
                from_date,
                to_date,
            },
        })
    }

    async fn build_from_pokebase(&self, limit: usize) -> Result<TopTeamsReport, AppError> {
        let page = self.pokebase.teams(1).await?;
        let community_total = page.community_total;
        let tournament_total = page.tournament_total;
        let cards = page
            .community
            .into_iter()
            .map(|card| (true, card))
            .chain(page.tournament.into_iter().map(|card| (false, card)));
        let mut out = Vec::new();
        for (community, card) in cards {
            let Some(top) = card.top.as_ref() else {
                continue;
            };
            if top.pokemon.len() < 3 {
                continue;
            }
            let mut members = Vec::new();
            for pokemon in &top.pokemon {
                let display = canonical_display_name(&pokemon.name);
                if display.is_empty() {
                    continue;
                }
                let (sprite_url, sprite_fallback_url, home_sprite_url) =
                    self.pokedex.sprite_urls_for(&display).await;
                members.push(TopTeamMember {
                    species: display,
                    sprite_url: pokemon.icon_url.clone().unwrap_or(sprite_url),
                    sprite_fallback_url,
                    home_sprite_url,
                    item: pokemon.item.clone(),
                    tera_type: None,
                    ability: None,
                    nature: None,
                    moves: pokemon
                        .moves
                        .iter()
                        .filter(|movement| !movement.slug.is_empty())
                        .map(|movement| prettify_public(&movement.slug))
                        .collect(),
                    level: None,
                    evs: None,
                    ivs: None,
                });
            }
            if members.len() < 3 {
                continue;
            }
            let record = match (top.wins, top.losses) {
                (Some(wins), Some(losses)) => {
                    Some(format!("{wins}-{losses}-{}", top.ties.unwrap_or(0)))
                }
                _ => None,
            };
            out.push(TopTeam {
                tournament: card
                    .tournament
                    .as_ref()
                    .map(|t| t.name.clone())
                    .filter(|name| !name.trim().is_empty())
                    .unwrap_or_else(|| "PokéBase community".to_string()),
                placing: top.placing,
                player: card.player(),
                country: card.country.clone(),
                record,
                members,
                provider: Some("pokebase".into()),
                community,
                source_url: card.source(),
                shared_at: card.shared_at(),
            });
            if out.len() >= limit {
                break;
            }
        }
        Ok(TopTeamsReport {
            teams: out,
            meta: TopTeamsMeta {
                tournaments_analyzed: tournament_total,
                battles_analyzed: community_total + tournament_total,
                source: "pokebase.app".into(),
                from_date: None,
                to_date: None,
            },
        })
    }
}
