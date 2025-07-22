use std::env;
// Importação corrigida com o nome EXATO do crate
use cess_rust_sdk::{Config, authorize, buy_space, create_bucket};
use std::{thread, time};

// ... O resto do arquivo setup_account.rs continua exatamente igual ...
fn main() {
    println!("--- Iniciando Setup da Conta na CESS ---");
    let mnemonic = env::var("CESS_ACCOUNT_MNEMONIC").expect("Variavel de ambiente CESS_ACCOUNT_MNEMONIC nao definida.");
    let config = Config::new("wss://testnet-rpc0.cess.cloud/ws/", &mnemonic);
    let one_second = time::Duration::from_secs(1);
    println!("\n[PASSO 1/3] Autorizando a conta...");
    match authorize(config.clone()) {
        Ok(tx_hash) => println!(" -> Conta autorizada com sucesso! Transacao: {}", tx_hash),
        Err(e) => { eprintln!(" -> Erro ao autorizar: {:?}. (Pode ignorar se a conta ja estava autorizada)", e); }
    }
    thread::sleep(one_second * 5);
    let gib_to_buy: u32 = 10;
    println!("\n[PASSO 2/3] Comprando {} GiB de espaco...", gib_to_buy);
    match buy_space(config.clone(), gib_to_buy) {
        Ok(tx_hash) => println!(" -> Espaco comprado com sucesso! Transacao: {}", tx_hash),
        Err(e) => { eprintln!(" -> Erro fatal ao comprar espaco: {:?}", e); return; }
    }
    thread::sleep(one_second * 5);
    let bucket_name = "vitrine-bucket";
    println!("\n[PASSO 3/3] Criando o bucket '{}'...", bucket_name);
    match create_bucket(config.clone(), bucket_name) {
        Ok(tx_hash) => println!(" -> Bucket '{}' criado com sucesso! Transacao: {}", bucket_name, tx_hash),
        Err(e) => { eprintln!(" -> Erro ao criar bucket: {:?}. (Pode ignorar se o bucket ja existia)", e); }
    }
    println!("\n--- ✅ Setup da conta na CESS concluido! ---");
}
