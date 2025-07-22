use axum::{routing::post, http::StatusCode, Json, Router};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::env;
use std::fs;
use tempfile::NamedTempFile;

// Importação corrigida com o nome EXATO do crate
use cess_rust_sdk::{Config, upload};

// ... O resto do arquivo main.rs continua exatamente igual ...
#[derive(Deserialize)]
struct UploadRequest { persona_data: String, }
#[derive(Serialize)]
struct UploadResponse { status: String, file_id: String, error: Option<String>, }
#[tokio::main]
async fn main() {
    let app = Router::new().route("/upload", post(handle_upload));
    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    println!("-> Microsserviço de upload CESS em Rust rodando em http://{}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
async fn handle_upload(Json(payload): Json<UploadRequest>) -> (StatusCode, Json<UploadResponse>) {
    println!("-> Recebida requisição de upload...");
    let mnemonic = match env::var("CESS_ACCOUNT_MNEMONIC") {
        Ok(val) => val,
        Err(_) => {
            eprintln!("-> Erro: Variavel de ambiente CESS_ACCOUNT_MNEMONIC nao definida.");
            let response = UploadResponse { status: "error".to_string(), file_id: "".to_string(), error: Some("Configuracao do servidor incompleta.".to_string()),};
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(response));
        }
    };
    let temp_file = NamedTempFile::new().expect("Falha ao criar arquivo temporario");
    let temp_path_buf = temp_file.into_temp_path();
    let temp_path_str = temp_path_buf.to_str().unwrap().to_string();
    fs::write(&temp_path_str, payload.persona_data).expect("Falha ao escrever no arquivo temporario");
    println!("-> Arquivo temporario criado em: {}", &temp_path_str);
    let config = Config::new("wss://testnet-rpc0.cess.cloud/ws/", &mnemonic);
    match upload(config, &temp_path_str, "vitrine_bucket") {
        Ok(file_id) => {
            println!("-> Upload para CESS bem-sucedido! FID: {}", file_id);
            let response = UploadResponse { status: "success".to_string(), file_id, error: None, };
            (StatusCode::OK, Json(response))
        },
        Err(e) => {
            eprintln!("-> Erro no upload para a CESS: {:?}", e);
            let response = UploadResponse { status: "error".to_string(), file_id: "".to_string(), error: Some(format!("Falha no upload para a CESS: {:?}", e)), };
            (StatusCode::INTERNAL_SERVER_ERROR, Json(response))
        }
    }
}
