import os
import json
import tempfile
import time
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from web3 import Web3
import spacy
import requests

# --- Configuração Inicial, IA, Conexão com Blockchains (sem alterações) ---
load_dotenv()
app = FastAPI()
origins = ["http://localhost:5173"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
nlp = spacy.load("en_core_web_sm")
CATEGORIES = {"Technology": ["blockchain", "ai", "software", "crypto"], "Finance": ["investing", "stocks", "finance"]}
def process_with_ai(data: dict) -> dict:
    interests_text = " ".join(data.get("interests", [])); doc = nlp(interests_text.lower()); detected_categories = set()
    for token in doc:
        for category, keywords in CATEGORIES.items():
            if token.lemma_ in keywords: detected_categories.add(category)
    persona = {"profile": {"ageRange": data.get("ageRange"), "favoriteBrands": data.get("favoriteBrands", [])},"interests": {"declared": data.get("interests", []), "inferred_categories": list(detected_categories)},"purchase_intent": data.get("purchaseIntent", []),"version": 1.0}
    return persona
HARDHAT_NODE_URL = "http://127.0.0.1:8545"; w3 = Web3(Web3.HTTPProvider(HARDHAT_NODE_URL)); OWNER_PRIVATE_KEY = os.getenv("DEPLOYER_PRIVATE_KEY"); CORE_CONTRACT_ADDRESS = os.getenv("VITRINE_CORE_ADDRESS")
if not OWNER_PRIVATE_KEY or not CORE_CONTRACT_ADDRESS: raise ValueError("Erro: Variáveis EVM não encontradas no .env")
owner_account = w3.eth.account.from_key(OWNER_PRIVATE_KEY)
with open('./artifacts/contracts/VitrineCore.sol/VitrineCore.json') as f: core_abi = json.load(f)['abi']
core_contract = w3.eth.contract(address=CORE_CONTRACT_ADDRESS, abi=core_abi)
CESS_GATEWAY_URL = "https://deoss-sgp.cess.network"

# --- Função de Upload para a CESS (Replicando o `curl` com --data) ---
def upload_to_cess(persona_json: str, object_name: str) -> Optional[str]:
    print("\n--- INICIANDO UPLOAD PARA A CESS (COM DADOS NO CORPO) ---")
    try:
        # 1. Montar os Headers estáticos da sua requisição bem-sucedida
        headers = {
            'Territory': "Vitrine",
            'Account': "cXh4NNAZKCtTEhZxVkJyBPcuHLV2WBqR89b2p6jQe4SyooFgc",
            'Message': "abacate123",
            'Signature': "0x66ff396cc266c8531b77fa253b42e8d18cbdde65ca46afa76a2d98c8ea720f056f67c3b8c5449bf0dbb73404cec8d1683f66228b64cbf4e4ddd5ee36d104298b",
        }

        # 2. Montar o URL com o nome do objeto
        upload_url = f"{CESS_GATEWAY_URL}/object/{object_name}"
        
        print(f"A enviar dados para: {upload_url}")
        
        # 3. Enviar a requisição com os dados da persona no corpo (parâmetro `data`)
        response = requests.put(
            upload_url, 
            headers=headers, 
            data=persona_json.encode('utf-8') # Enviamos como bytes
        )
        
        response.raise_for_status()
        
        # A resposta para este tipo de upload é um JSON com o FID
        response_data = response.json()
        file_id = response_data.get("fid")

        print(f"✅ Upload para CESS bem-sucedido! FID: {file_id}")
        return file_id

    except Exception as e:
        print(f"❌ Erro durante o upload para a CESS: {e}")
        if 'response' in locals():
            print(f"   Resposta do servidor: {response.status_code} - {response.text}")
        return None

# --- Lógica da API ---
class PersonaData(BaseModel):
    interests: List[str]; purchaseIntent: List[str]; ageRange: Optional[str] = None; favoriteBrands: List[str]

@app.get("/")
def read_root(): return {"message": "Servidor Backend da Vitrine está no ar!"}

@app.post("/api/persona/update")
async def update_persona(data: PersonaData, user_address: str):
    print("\n--- API RECEBEU DADOS DA PERSONA DO FRONTEND ---")
    persona_dict = process_with_ai(data.model_dump())
    persona_json_string = json.dumps(persona_dict, sort_keys=True)
    
    object_name = f"persona_{user_address}.json"
    
    file_id = upload_to_cess(persona_json_string, object_name)
    if not file_id:
        return {"status": "error", "message": "Falha no upload para a CESS."}
    
    persona_hash = w3.keccak(text=persona_json_string)
    try:
        print("\nConstruindo a transação para 'updatePersonaHash'...")
        nonce = w3.eth.get_transaction_count(owner_account.address)
        tx_data = core_contract.functions.updatePersonaHash(user_address, persona_hash).build_transaction({'from': owner_account.address, 'nonce': nonce})
        signed_tx = w3.eth.account.sign_transaction(tx_data, private_key=OWNER_PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        print("A aguardar confirmação da transação na EVM...")
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        print(f"✅ Transação EVM confirmada! Hash: {tx_receipt.transactionHash.hex()}")
        return {"status": "success", "tx_hash": tx_receipt.transactionHash.hex(), "cess_fid": file_id}
    except Exception as e:
        print(f"❌ Erro ao interagir com o smart contract EVM: {e}")
        return {"status": "error", "message": str(e)}
