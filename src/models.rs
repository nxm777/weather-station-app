use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct WeatherReading {
    pub id: i64,
    pub temperature: f64,
    pub humidity: f64,
    pub recorded_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct WeatherPayload {
    pub temperature: f64,
    pub humidity: f64,
}