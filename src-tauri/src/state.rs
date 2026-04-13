use crate::adapters::{HttpClient, LimitlessClient, PkmnDataClient, ShowdownClient, SmogonClient};
use crate::error::AppError;
use crate::services::{
    ChampionsReportService, MetaService, PokedexService, SetsService, TeamService, TopTeamsService,
};
use crate::storage::{init_pool, CacheRepo, DbPool, SettingsRepo, TeamRepo};
use std::path::Path;
use std::sync::Arc;

pub struct AppState {
    pub db: DbPool,
    pub meta: MetaService,
    pub pokedex: PokedexService,
    pub sets: SetsService,
    pub teams: TeamService,
    pub top_teams: TopTeamsService,
    pub champions: ChampionsReportService,
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
        let pkmn = PkmnDataClient::new(http.clone());

        let meta = MetaService::new(
            limitless.clone(),
            smogon.clone(),
            cache.clone(),
            settings.clone(),
        );
        let pokedex = PokedexService::new(showdown.clone(), cache.clone());
        let sets = SetsService::new(pkmn.clone(), cache.clone());
        let teams = TeamService::new(team_repo);
        let top_teams = TopTeamsService::new(limitless.clone(), cache.clone());
        let champions = ChampionsReportService::new(limitless.clone());

        Ok(Self {
            db: pool,
            meta,
            pokedex,
            sets,
            teams,
            top_teams,
            champions,
            settings,
        })
    }
}
