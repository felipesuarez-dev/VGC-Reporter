use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("HTTP error: {0}")]
    Http(String),

    #[error("database error: {0}")]
    Db(#[from] rusqlite::Error),

    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    #[error("serde error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error("not found: {0}")]
    NotFound(String),

    #[error("validation error: {0}")]
    Validation(String),

    #[error("internal error: {0}")]
    Internal(String),
}

impl From<reqwest::Error> for AppError {
    fn from(e: reqwest::Error) -> Self {
        AppError::Http(e.to_string())
    }
}

/// Tauri IPC serializes errors to the frontend. We expose a flat shape.
#[derive(Serialize)]
struct SerializableError {
    kind: String,
    message: String,
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let (kind, message) = match self {
            AppError::Http(m) => ("http", m.clone()),
            AppError::Db(e) => ("db", e.to_string()),
            AppError::Io(e) => ("io", e.to_string()),
            AppError::Serde(e) => ("serde", e.to_string()),
            AppError::NotFound(m) => ("not_found", m.clone()),
            AppError::Validation(m) => ("validation", m.clone()),
            AppError::Internal(m) => ("internal", m.clone()),
        };
        SerializableError {
            kind: kind.into(),
            message,
        }
        .serialize(serializer)
    }
}

pub type AppResult<T> = Result<T, AppError>;
