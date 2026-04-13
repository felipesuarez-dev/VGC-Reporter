use crate::config;

/// Build a Showdown sprite URL from a species name / id.
/// Showdown sprites use lowercase ids with no spaces or punctuation.
pub fn sprite_url(species: &str) -> String {
    let id: String = species
        .to_lowercase()
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect();
    format!("{}/{}.png", config::SHOWDOWN_SPRITES, id)
}

pub fn canonical_id(species: &str) -> String {
    species
        .to_lowercase()
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn basic_sprite_url() {
        assert!(sprite_url("Incineroar").ends_with("/incineroar.png"));
    }

    #[test]
    fn handles_punctuation() {
        assert!(sprite_url("Mr. Rime").ends_with("/mrrime.png"));
    }
}
