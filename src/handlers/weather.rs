use axum::{
    Json, Router, extract::{Query, State}, http::{HeaderMap, HeaderValue, header}, response::IntoResponse, routing::get
};

use chrono::{DateTime, Utc};
use serde::Deserialize;
use sqlx::SqlitePool;
use crate::models::{WeatherPayload, WeatherReading};
use crate::state::AppState;

use axum::http::StatusCode;

pub fn routes() -> Router<AppState> {
    Router::new()
    .route("/", get(list_readings).post(create_reading))
    .route("/export", get(export_readings))

}

#[derive(Debug, Deserialize, Default)]
struct DateRangeFilters {
    from: Option<DateTime<Utc>>,
    to: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize, Default)]
struct ReadingFilters {
    #[serde(flatten)]
    date_range: DateRangeFilters,
    limit: Option<i64>,
    after_id: Option<i64>,
}

fn apply_date_filters(qb: &mut sqlx::QueryBuilder<sqlx::Sqlite>, filters: &DateRangeFilters) {
    if let Some(from) = filters.from {
        qb.push(" AND recorded_at >= ").push_bind(from);
    }
    if let Some(to) = filters.to {
        qb.push(" AND recorded_at <= ").push_bind(to);
    }
}

async fn fetch_readings(
    db: &SqlitePool, 
    filters: &ReadingFilters
) -> Result<Vec<WeatherReading>, sqlx::Error> {
    let mut qb = sqlx::QueryBuilder::new(
        "SELECT id, temperature, humidity, recorded_at FROM weather_readings WHERE 1=1",
    );

    apply_date_filters(&mut qb, &filters.date_range);

    if let Some(after_id) = filters.after_id {
        qb.push(" AND id > ").push_bind(after_id);
    }

    qb.push(" ORDER BY id");

    let limit = filters.limit.unwrap_or(100).clamp(1, 1000);
    qb.push(" LIMIT ").push_bind(limit);

    qb.build_query_as::<WeatherReading>().fetch_all(db).await
}

async fn fetch_readings_in_range(
    db: &SqlitePool,
    filters: &DateRangeFilters,
) -> Result<Vec<WeatherReading>, sqlx::Error> {
    let mut qb = sqlx::QueryBuilder::new(
        "SELECT id, temperature, humidity, recorded_at FROM weather_readings WHERE 1=1",
    );

    apply_date_filters(&mut qb, filters);

    qb.push(" ORDER BY id");

    qb.build_query_as::<WeatherReading>().fetch_all(db).await
}

async fn list_readings(
    State(state): State<AppState>,
    Query(filters): Query<ReadingFilters>
) -> Result<Json<Vec<WeatherReading>>, String> {
    let readings = fetch_readings(&state.db, &filters)
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
        INSERT INTO weather_readings (temperature, humidity, recorded_at)
        VALUES (?, ?, ?)
        RETURNING id, temperature, humidity, recorded_at
        "#,
    )
    .bind(payload.temperature)
    .bind(payload.humidity)
    .bind(chrono::Utc::now())
    .fetch_one(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok((StatusCode::CREATED, Json(reading)))
}

fn build_export_filename(filters: &DateRangeFilters) -> String {
    let now = chrono::Local::now().format("%Y-%m-%d_%H-%M-%S");

    match (filters.from, filters.to) {
        (Some(from), Some(to)) => format!(
            "weather_readings_{}_{}_{}.csv",
            from.format("%Y-%m-%d"),
            to.format("%Y-%m-%d"),
            now
        ),
        (Some(from), None) => format!(
            "weather_readings_from_{}_{}.csv",
            from.format("%Y-%m-%d"),
            now
        ),
        (None, Some(to)) => format!(
            "weather_readings_to_{}_{}.csv",
            to.format("%Y-%m-%d"),
            now
        ),
        (None, None) => format!("weather_readings_{}.csv", now),
    }
}

async fn export_readings(
    State(state): State<AppState>,
     Query(filters): Query<DateRangeFilters>
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let readings = fetch_readings_in_range(&state.db, &filters)
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
            record.recorded_at.format("%Y-%m-%d %H:%M:%S").to_string()
        ])
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    let csv_data = wtr.into_inner()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let filename = build_export_filename(&filters);
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