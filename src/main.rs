use axum::{routing::get, Router};
use tokio::net::TcpListener;

use std::env;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    let host = env::var("SERVER_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = env::var("SERVER_PORT").unwrap_or_else(|_| "3000".to_string());
    let address = format!("{}:{}", host, port);

    let app = Router::new().route("/", get(health_check));
    let listener = TcpListener::bind(&address)
        .await
        .expect("Failed to start a server");

    println!("Server is running at http://{}", address);

    

    axum::serve(listener, app).await.unwrap();
}

async fn health_check() -> &'static str {
    "Server is running"
}