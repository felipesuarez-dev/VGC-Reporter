use crate::adapters::{
    HttpClient, LabmausClient, LimitlessClient, PikalyticsClient, PkmnDataClient, PokeApiClient,
    PokepasteClient, ShowdownClient, SmogonClient,
};
use crate::error::AppError;
use crate::services::{
    ChampionsReportService, MetaService, PikalyticsService, PokedexService, SetsService,
    TeamService, TopTeamsService, TranslationsService, TrendingService, UpcomingTournamentsService,
};
use crate::storage::{init_pool, CacheRepo, DbPool, SettingsRepo, TeamRepo};
use std::path::Path;
use std::sync::Arc;

pub struct AppState {
    pub db: DbPool,
    pub meta: MetaService,
    pub pokedex: Arc<PokedexService>,
    pub sets: SetsService,
    pub teams: TeamService,
    pub top_teams: TopTeamsService,
    pub champions: ChampionsReportService,
    pub upcoming: UpcomingTournamentsService,
    pub translations: TranslationsService,
    pub pikalytics: PikalyticsService,
    pub trending: TrendingService,
    pub settings: Arc<SettingsRepo>,
}

impl AppState {
    pub fn bootstrap(db_path: &Path) -> Result<Self, AppError> {
        let pool = init_pool(db_path)?;
        let cache = Arc::new(CacheRepo::new(pool.clone()));
        let settings = Arc::new(SettingsRepo::new(pool.clone()));
        let team_repo = Arc::new(TeamRepo::new(pool.clone()));

        let http = Arc::new(HttpClient::new(cache.clone())?);
        let showdown = ShowdownClient::new((*http).clone());
        let limitless = LimitlessClient::new((*http).clone());
        let smogon = SmogonClient::new((*http).clone());
        let pkmn = PkmnDataClient::new((*http).clone());
        let pokeapi = PokeApiClient::new((*http).clone());
        let pikalytics_client = PikalyticsClient::new((*http).clone());
        let labmaus = LabmausClient::new(http.clone());
        let pokepaste = PokepasteClient::new(http.clone());

        let pokedex = Arc::new(PokedexService::new(
            showdown.clone(),
            pokeapi.clone(),
            cache.clone(),
        ));
        let meta = MetaService::new(
            labmaus.clone(),
            pokepaste.clone(),
            limitless.clone(),
            smogon.clone(),
            pokedex.clone(),
            cache.clone(),
            settings.clone(),
        );
        let sets = SetsService::new(pkmn.clone(), cache.clone());
        let teams = TeamService::new(team_repo);
        let top_teams = TopTeamsService::new(
            labmaus.clone(),
            pokepaste.clone(),
            limitless.clone(),
            pokedex.clone(),
            cache.clone(),
        );
        let champions = ChampionsReportService::new(limitless.clone(), pokedex.clone());
        let upcoming = UpcomingTournamentsService::new(limitless.clone());
        let translations = TranslationsService::new(pokeapi);
        let pikalytics = PikalyticsService::new(pikalytics_client, cache.clone(), pokedex.clone());
        let trending = TrendingService::new(labmaus.clone(), cache.clone(), settings.clone());

        Ok(Self {
            db: pool,
            meta,
            pokedex,
            sets,
            teams,
            top_teams,
            champions,
            upcoming,
            translations,
            pikalytics,
            trending,
            settings,
        })
    }
}
