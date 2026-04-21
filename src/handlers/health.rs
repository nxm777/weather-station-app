use axum::{routing::get, Router};

use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new().route("/", get(health_check))
}

async fn health_check() -> &'static str {
    "Server is running"
}