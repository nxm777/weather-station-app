mod db;
mod handlers;
mod models;
mod state;

use std::env;

use axum::Router;
use tokio::net::TcpListener;

use crate::state::AppState;


#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set in .env file");

    let pool = db::init_db(&database_url)
        .await
        .expect("Failed to initialize database");

    println!("Database initialized");

    let state = AppState { db: pool };

    let host = env::var("SERVER_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = env::var("SERVER_PORT").unwrap_or_else(|_| "3000".to_string());
    let address = format!("{}:{}", host, port);

    let app = Router::new()
        .merge(handlers::health::routes())
        .nest("/readings", handlers::weather::routes())
        .with_state(state);

    let listener = TcpListener::bind(&address)
        .await
        .expect("Failed to bind to address");

    println!("Server is running at http://{}", address);

    axum::serve(listener, app)
        .await
        .unwrap();
}