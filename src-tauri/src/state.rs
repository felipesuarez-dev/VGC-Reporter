use crate::adapters::{HttpClient, LimitlessClient, ShowdownClient, SmogonClient};
use crate::error::AppError;
use crate::services::{MetaService, PokedexService, TeamService, TopTeamsService};
use crate::storage::{init_pool, CacheRepo, DbPool, SettingsRepo, TeamRepo};
use std::path::Path;
use std::sync::Arc;

pub struct AppState {
    pub db: DbPool,
    pub meta: MetaService,
    pub pokedex: PokedexService,
    pub teams: TeamService,
    pub top_teams: TopTeamsService,
    pub settings: Arc<SettingsRepo>,
}

impl AppState {
    pub fn bootstrap(db_path: &Path) -> Result<Self, AppError> {
        let pool = init_pool(db_path)?;
        let cache = Arc::new(CacheRepo::new(pool.clone()));
        let settings = Arc::new(SettingsRepo::new(pool.clone()));
        let team_repo = Arc::new(TeamRepo::new(pool.clone()));

        let http = HttpClient::new(cache.clone())?;
        let showdown = ShowdownClient::new(http.clone());
        let limitless = LimitlessClient::new(http.clone());
        let smogon = SmogonClient::new(http.clone());

        let meta = MetaService::new(limitless.clone(), smogon.clone(), cache.clone());
        let pokedex = PokedexService::new(showdown.clone(), cache.clone());
        let teams = TeamService::new(team_repo);
        let top_teams = TopTeamsService::new(limitless.clone(), cache.clone());

        Ok(Self {
            db: pool,
            meta,
            pokedex,
            teams,
            top_teams,
            settings,
        })
    }
}
