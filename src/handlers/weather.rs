use axum::{
    extract::State,
    routing::get,
    Json, Router,
};

use crate::models::{WeatherPayload, WeatherReading};
use crate::state::AppState;

use axum::http::StatusCode;

pub fn routes() -> Router<AppState> {
    Router::new().route("/", get(list_readings).post(create_reading))
}

async fn list_readings(
    State(state): State<AppState>,
) -> Result<Json<Vec<WeatherReading>>, String> {
    let readings = sqlx::query_as::<_, WeatherReading>(
        "SELECT id, temperature, humidity, recorded_at FROM weather_readings ORDER BY recorded_at DESC"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(Json(readings))
}

async fn create_reading(
    State(state): State<AppState>,
    Json(payload): Json<WeatherPayload>,
) -> Result<(StatusCode, Json<WeatherReading>), String> {
    let reading = sqlx::query_as::<_, WeatherReading>(
        r#"
        INSERT INTO weather_readings (temperature, humidity)
        VALUES (?, ?)
        RETURNING id, temperature, humidity, recorded_at
        "#,
    )
    .bind(payload.temperature)
    .bind(payload.humidity)
    .fetch_one(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok((StatusCode::CREATED, Json(reading)))
}