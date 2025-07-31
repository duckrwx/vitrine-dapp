import os
import json
import tempfile
import time
import uuid
import datetime
import shutil
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional, Dict
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from web3 import Web3
import spacy
import requests
from sqlalchemy.orm import Session

import database
from database import SessionLocal, engine

database.create_db_and_tables()

# --- Configuração ---
load_dotenv(); app = FastAPI(); origins = ["*"]; app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"]);
app.mount("/static", StaticFiles(directory="static"), name="static")
nlp = spacy.load("en_core_web_sm"); CATEGORIES = {"Technology": ["blockchain", "ai", "software", "crypto"], "Finance": ["investing", "stocks", "finance"]};
def process_with_ai(data: dict) -> dict:
    interests_text = " ".join(data.get("interests", [])); doc = nlp(interests_text.lower()); detected_categories = set()
    for token in doc:
        for category, keywords in CATEGORIES.items():
            if token.lemma_ in keywords: detected_categories.add(category)
    persona = {"profile": {"ageRange": data.get("ageRange"), "favoriteBrands": data.get("favoriteBrands", [])},"interests": {"declared": data.get("interests", []), "inferred_categories": list(detected_categories)},"purchase_intent": data.get("purchaseIntent", []),"version": 1.0}
    return persona
HARDHAT_NODE_URL = "http://127.0.0.1:8545"; w3 = Web3(Web3.HTTPProvider(HARDHAT_NODE_URL)); BACKEND_PRIVATE_KEY = os.getenv("DEPLOYER_PRIVATE_KEY"); CORE_CONTRACT_ADDRESS = os.getenv("VITRINE_CORE_ADDRESS"); MARKETPLACE_ADDRESS = os.getenv("MARKETPLACE_ADDRESS")
if not BACKEND_PRIVATE_KEY or not CORE_CONTRACT_ADDRESS or not MARKETPLACE_ADDRESS: raise ValueError("Erro Crítico: Variáveis de ambiente não encontradas")
owner_account = w3.eth.account.from_key(BACKEND_PRIVATE_KEY)
with open('./artifacts/contracts/VitrineCore.sol/VitrineCore.json') as f: core_abi = json.load(f)['abi']
with open('./artifacts/contracts/Marketplace.sol/Marketplace.json') as f: marketplace_abi = json.load(f)['abi']
core_contract = w3.eth.contract(address=CORE_CONTRACT_ADDRESS, abi=core_abi)
marketplace_contract = w3.eth.contract(address=MARKETPLACE_ADDRESS, abi=marketplace_abi)
CESS_GATEWAY_URL = "https://deoss-sgp.cess.network"

# --- FUNÇÃO DE UPLOAD CORRIGIDA PARA USAR /file ---
def upload_to_cess(data_to_upload: bytes, filename: str) -> Optional[str]:
    print(f"\n--- A FAZER UPLOAD DO FICHEIRO '{filename}' PARA A CESS (VIA /file) ---")
    try:
        headers = {
            'Territory': "Vitrine",
            'Account': "cXh4NNAZKCtTEhZxVkJyBPcuHLV2WBqR89b2p6jQe4SyooFgc",
            'Message': "abacate123",
            'Signature': "0x66ff396cc266c8531b77fa253b42e8d18cbdde65ca46afa76a2d98c8ea720f056f67c3b8c5449bf0dbb73404cec8d1683f66228b64cbf4e4ddd5ee36d104298b",
        }
        
        upload_url = f"{CESS_GATEWAY_URL}/file"
        files_payload = {
            'file': (filename, data_to_upload, 'application/octet-stream')
        }
        
        response = requests.put(upload_url, headers=headers, files=files_payload)
        response.raise_for_status()
        
        # A resposta do endpoint /file é apenas o FID como texto
        file_id = response.text.strip('"')
        
        if not file_id:
            raise ValueError("Resposta do servidor vazia.")

        print(f"✅ Upload para CESS bem-sucedido! FID: {file_id}")
        return file_id
    except Exception as e:
        print(f"❌ Erro no upload para a CESS: {e}")
        if 'response' in locals():
            print(f"   Resposta do servidor: {response.status_code} - {response.text}")
        return None

def get_db():
    db = SessionLocal();
    try: yield db
    finally: db.close()

# --- Endpoints da Persona e Extensão (sem alterações) ---
# ... (os seus endpoints existentes de persona, link_extension, etc., continuam aqui)

# --- Endpoints do Marketplace ---
@app.post("/api/upload/image")
async def upload_image(file: UploadFile = File(...)):
    os.makedirs("static/images", exist_ok=True)
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join("static/images", unique_filename)
    
    image_bytes = await file.read() # Lê os bytes do ficheiro em memória
    
    with open(file_path, "wb") as buffer:
        buffer.write(image_bytes)
    
    image_hash = w3.keccak(image_bytes).hex()

    return {
        "image_url": f"/static/images/{unique_filename}",
        "image_hash": image_hash
    }

class ProductMetadata(BaseModel):
    name: str; description: str; price: str; commission: str; tags: List[str]; image_url: str; image_hash: str

@app.post("/api/products/prepare_metadata")
async def prepare_metadata(data: ProductMetadata):
    print("\n--- A PREPARAR METADATOS DO PRODUTO ---")
    metadata_json_string = data.model_dump_json(indent=2)
    
    # Agora esta função chama a versão correta do upload_to_cess
    metadata_fid = upload_to_cess(metadata_json_string.encode('utf-8'), "metadata.json")
    
    if not metadata_fid:
        raise HTTPException(status_code=500, detail="Falha ao fazer upload dos metadatos para a CESS.")
    
    return {"metadata_fid": metadata_fid}

# --- Lógica da API Principal (Persona) ---
class PersonaData(BaseModel):
    interests: List[str]; purchaseIntent: List[str]; ageRange: Optional[str] = None; favoriteBrands: List[str]
@app.post("/api/persona/update")
async def update_persona(data: PersonaData, user_address: str, db: Session = Depends(get_db)):
    # Este endpoint agora usa a função de upload de ficheiro correta
    persona_dict = process_with_ai(data.model_dump())
    persona_json_string = json.dumps(persona_dict, sort_keys=True)
    object_name = f"persona_{user_address}.json"
    file_id = upload_to_cess(persona_json_string.encode('utf-8'), object_name)
    if not file_id:
        raise HTTPException(status_code=500, detail="Falha no upload da persona para a CESS.")
    
    # ... (resto da lógica de blockchain e DB)
    persona_hash = w3.keccak(text=persona_json_string)
    try:
        nonce = w3.eth.get_transaction_count(owner_account.address)
        tx_data = core_contract.functions.updatePersonaHash(user_address, persona_hash).build_transaction({'from': owner_account.address, 'nonce': nonce})
        signed_tx = w3.eth.account.sign_transaction(tx_data, private_key=BACKEND_PRIVATE_KEY); tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash); on_chain_hash_hex = tx_receipt.transactionHash.hex()
        rep_tx_data = core_contract.functions.updateUserReputation(user_address, 10).build_transaction({'from': owner_account.address, 'nonce': nonce + 1})
        signed_rep_tx = w3.eth.account.sign_transaction(rep_tx_data, private_key=BACKEND_PRIVATE_KEY); rep_tx_hash = w3.eth.send_raw_transaction(signed_rep_tx.raw_transaction)
        w3.eth.wait_for_transaction_receipt(rep_tx_hash)
        db_persona = db.query(database.Persona).filter(database.Persona.user_address == user_address).first()
        if not db_persona: db_persona = database.Persona(user_address=user_address); db.add(db_persona)
        db_persona.cess_fid = file_id; db_persona.on_chain_hash = on_chain_hash_hex; db_persona.updated_at = datetime.datetime.utcnow(); db.commit()
        return {"status": "success", "tx_hash": on_chain_hash_hex, "cess_fid": file_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
