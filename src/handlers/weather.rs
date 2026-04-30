use axum::{
    extract::State,
    routing::get,
    http::{header, HeaderMap, HeaderValue},
    response::IntoResponse,
    Json, Router,
};

use sqlx::SqlitePool;
use crate::models::{WeatherPayload, WeatherReading};
use crate::state::AppState;

use axum::http::StatusCode;

pub fn routes() -> Router<AppState> {
    Router::new()
    .route("/", get(list_readings).post(create_reading))
    .route("/export", get(export_readings))

}

async fn fetch_all_readings(db: &SqlitePool) -> Result<Vec<WeatherReading>, sqlx::Error> {
    sqlx::query_as::<_, WeatherReading>(
        "SELECT id, temperature, humidity, recorded_at FROM weather_readings ORDER BY id"
    )
    .fetch_all(db)
    .await
}

async fn list_readings(
    State(state): State<AppState>,
) -> Result<Json<Vec<WeatherReading>>, String> {
    let readings = fetch_all_readings(&state.db)
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

async fn export_readings(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let readings = fetch_all_readings(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut wtr = csv::Writer::from_writer(vec![]);

    wtr.write_record(&["id", "temperature", "humidity", "recorded_at"])
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    for record in readings {
        wtr.write_record(&[
            record.id.to_string(),
            record.temperature.to_string(),
            record.humidity.to_string(),
            record.recorded_at.to_rfc3339(),
        ])
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    let csv_data = wtr.into_inner()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let filename = format!(
        "weather_readings_{}.csv",
        chrono::Local::now().format("%Y-%m-%d_%H-%M-%S")
    );
    let disposition = format!("attachment; filename=\"{}\"", filename);

    let mut headers = HeaderMap::new();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/csv; charset=utf-8"),
    );
    headers.insert(
    header::CONTENT_DISPOSITION,
    HeaderValue::from_str(&disposition)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?,
);

    Ok((headers, csv_data))
}