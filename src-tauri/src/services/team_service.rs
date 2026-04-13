use crate::domain::team::Team;
use crate::error::AppError;
use crate::storage::TeamRepo;
use std::sync::Arc;

#[derive(Clone)]
pub struct TeamService {
    repo: Arc<TeamRepo>,
}

impl TeamService {
    pub fn new(repo: Arc<TeamRepo>) -> Self {
        Self { repo }
    }

    pub fn save(&self, team: &Team) -> Result<i64, AppError> {
        team.validate()
            .map_err(|e| AppError::Validation(e.to_string()))?;
        self.repo.save(team)
    }

    pub fn list(&self) -> Result<Vec<Team>, AppError> {
        self.repo.list()
    }

    pub fn get(&self, id: i64) -> Result<Team, AppError> {
        self.repo
            .get(id)?
            .ok_or_else(|| AppError::NotFound(format!("team {id}")))
    }

    pub fn delete(&self, id: i64) -> Result<(), AppError> {
        self.repo.delete(id)
    }
}
