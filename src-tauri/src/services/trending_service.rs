use crate::adapters::sprite_resolver::{
    canonical_display_name, fallback_sprite_url, primary_sprite_url,
};
use crate::adapters::{LabmausClient, LabmausTrend, TrendDirection};
use crate::config;
use crate::domain::trending::{TrendingPokemon, TrendingReport};
use crate::error::AppError;
use crate::services::date_window::default_window;
use crate::services::usage_aggregator::prettify_public;
use crate::storage::CacheRepo;
use std::sync::Arc;

const TRENDING_QUANTITY: u32 = 15;
const TRENDING_LANGUAGE: &str = "en";

#[derive(Clone)]
pub struct TrendingService {
    labmaus: LabmausClient,
    cache: Arc<CacheRepo>,
}

impl TrendingService {
    pub fn new(labmaus: LabmausClient, cache: Arc<CacheRepo>) -> Self {
        Self { labmaus, cache }
    }

    pub async fn get_trending(&self) -> Result<TrendingReport, AppError> {
        let key = "trending::v1::regulation-m-a";
        if let Some(bytes) = self.cache.get(key)? {
            if let Ok(report) = serde_json::from_slice::<TrendingReport>(&bytes) {
                return Ok(report);
            }
        }

        let rising = match self
            .labmaus
            .get_trending_pokemon(TrendDirection::Up, TRENDING_QUANTITY, TRENDING_LANGUAGE)
            .await
        {
            Ok(v) => v,
            Err(e) => {
                tracing::warn!(error = ?e, "labmaus rising trend failed");
                Vec::new()
            }
        };
        let falling = match self
            .labmaus
            .get_trending_pokemon(TrendDirection::Down, TRENDING_QUANTITY, TRENDING_LANGUAGE)
            .await
        {
            Ok(v) => v,
            Err(e) => {
                tracing::warn!(error = ?e, "labmaus falling trend failed");
                Vec::new()
            }
        };

        let (from, to) = default_window();
        let report = TrendingReport {
            rising: rising.into_iter().map(to_trending).collect(),
            falling: falling.into_iter().map(to_trending).collect(),
            from_date: Some(from),
            to_date: Some(to),
        };

        let bytes = serde_json::to_vec(&report)?;
        self.cache.put(key, &bytes, config::TTL_LABMAUS_TRENDING)?;
        Ok(report)
    }
}

fn to_trending(t: LabmausTrend) -> TrendingPokemon {
    let canonical = canonical_display_name(&t.name);
    TrendingPokemon {
        species: prettify_public(&canonical),
        sprite_url: primary_sprite_url(&canonical),
        sprite_fallback_url: fallback_sprite_url(&canonical),
        change_percentage: t.change_percentage,
        day1_percentage: t.day1_percentage,
        day2_percentage: t.day2_percentage,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_labmaus_trend_to_domain() {
        let t = LabmausTrend {
            id: "479-w".into(),
            name: "Rotom-Wash".into(),
            icon: None,
            day1_usage: Some(5),
            day2_usage: Some(20),
            day1_percentage: 2.0,
            day2_percentage: 8.0,
            change_percentage: 6.0,
        };
        let out = to_trending(t);
        assert_eq!(out.species, "Rotom Wash");
        assert!(out.sprite_url.ends_with("/rotom-wash.png"));
        assert_eq!(
            out.sprite_fallback_url.as_deref(),
            Some("https://play.pokemonshowdown.com/sprites/dex/rotomwash.png")
        );
        assert!((out.change_percentage - 6.0).abs() < 0.001);
    }
}
