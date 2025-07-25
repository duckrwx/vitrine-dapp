import os
import json
import tempfile
import time
import uuid
import datetime
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
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
nlp = spacy.load("en_core_web_sm"); CATEGORIES = {"Technology": ["blockchain", "ai", "software", "crypto"], "Finance": ["investing", "stocks", "finance"]};
def process_with_ai(data: dict) -> dict:
    interests_text = " ".join(data.get("interests", [])); doc = nlp(interests_text.lower()); detected_categories = set()
    for token in doc:
        for category, keywords in CATEGORIES.items():
            if token.lemma_ in keywords: detected_categories.add(category)
    persona = {"profile": {"ageRange": data.get("ageRange"), "favoriteBrands": data.get("favoriteBrands", [])},"interests": {"declared": data.get("interests", []), "inferred_categories": list(detected_categories)},"purchase_intent": data.get("purchaseIntent", []),"version": 1.0}
    return persona

# --- Configuração das Blockchains (com Nomes Padronizados) ---
HARDHAT_NODE_URL = "http://127.0.0.1:8545";
w3 = Web3(Web3.HTTPProvider(HARDHAT_NODE_URL));

# ✅ NOMES CORRETOS A SEREM LIDOS DO .env
BACKEND_PRIVATE_KEY = os.getenv("DEPLOYER_PRIVATE_KEY") 
CORE_CONTRACT_ADDRESS = os.getenv("VITRINE_CORE_ADDRESS") 

if not BACKEND_PRIVATE_KEY or not CORE_CONTRACT_ADDRESS: 
    raise ValueError("Erro Crítico: As variáveis DEPLOYER_PRIVATE_KEY e/ou VITRINE_CORE_ADDRESS não foram encontradas no .env")

owner_account = w3.eth.account.from_key(BACKEND_PRIVATE_KEY)

with open('./artifacts/contracts/VitrineCore.sol/VitrineCore.json') as f: 
    core_abi = json.load(f)['abi']
core_contract = w3.eth.contract(address=CORE_CONTRACT_ADDRESS, abi=core_abi)

CESS_GATEWAY_URL = "https://deoss-sgp.cess.network"

def upload_to_cess(persona_json: str, object_name: str) -> Optional[str]:
    try:
        headers = {'Territory': "Vitrine",'Account': "cXh4NNAZKCtTEhZxVkJyBPcuHLV2WBqR89b2p6jQe4SyooFgc",'Message': "abacate123",'Signature': "0x66ff396cc266c8531b77fa253b42e8d18cbdde65ca46afa76a2d98c8ea720f056f67c3b8c5449bf0dbb73404cec8d1683f66228b64cbf4e4ddd5ee36d104298b"}
        upload_url = f"{CESS_GATEWAY_URL}/object/{object_name}"; response = requests.put(upload_url, headers=headers, data=persona_json.encode('utf-8')); response.raise_for_status()
        response_data = response.json(); file_id = response_data.get("data", {}).get("fid")
        if not file_id: raise ValueError(f"FID não encontrado na resposta: {response_data}")
        print(f"✅ Upload para CESS bem-sucedido! FID: {file_id}"); return file_id
    except Exception as e:
        print(f"❌ Erro durante o upload para a CESS: {e}")
        if 'response' in locals(): print(f"   Resposta do servidor: {response.status_code} - {response.text}")
        return None

def get_db():
    db = SessionLocal();
    try: yield db
    finally: db.close()

def _process_and_update_persona(user_address: str, persona_data: dict, db: Session):
    persona_dict = process_with_ai(persona_data); persona_json_string = json.dumps(persona_dict, sort_keys=True)
    object_name = f"persona_{user_address}.json"; new_file_id = upload_to_cess(persona_json_string, object_name)
    if not new_file_id: raise HTTPException(status_code=500, detail="Falha no upload do novo ficheiro para a CESS.")
    persona_hash = w3.keccak(text=persona_json_string)
    try:
        nonce = w3.eth.get_transaction_count(owner_account.address)
        tx_data = core_contract.functions.updatePersonaHash(user_address, persona_hash).build_transaction({'from': owner_account.address, 'nonce': nonce})
        
        # ✅ Usa a variável com o nome correto
        signed_tx = w3.eth.account.sign_transaction(tx_data, private_key=BACKEND_PRIVATE_KEY); 
        
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash); on_chain_hash_hex = tx_receipt.transactionHash.hex()
        rep_tx_data = core_contract.functions.updateUserReputation(user_address, 10).build_transaction({'from': owner_account.address, 'nonce': nonce + 1})
        
        # ✅ Usa a variável com o nome correto
        signed_rep_tx = w3.eth.account.sign_transaction(rep_tx_data, private_key=BACKEND_PRIVATE_KEY); 
        
        rep_tx_hash = w3.eth.send_raw_transaction(signed_rep_tx.raw_transaction)
        w3.eth.wait_for_transaction_receipt(rep_tx_hash)
        db_persona = db.query(database.Persona).filter(database.Persona.user_address == user_address).first()
        if not db_persona: db_persona = database.Persona(user_address=user_address); db.add(db_persona)
        db_persona.cess_fid = new_file_id; db_persona.on_chain_hash = on_chain_hash_hex; db_persona.updated_at = datetime.datetime.utcnow(); db.commit()
        return {"status": "success", "tx_hash": on_chain_hash_hex, "cess_fid": new_file_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class PersonaData(BaseModel):
    interests: List[str]; purchaseIntent: List[str]; ageRange: Optional[str] = None; favoriteBrands: List[str]
@app.post("/api/persona/update")
async def update_persona(data: PersonaData, user_address: str, db: Session = Depends(get_db)):
    return _process_and_update_persona(user_address, data.model_dump(), db)

@app.post("/api/user/link_extension")
async def link_extension(user_address: str, db: Session = Depends(get_db)):
    db_persona = db.query(database.Persona).filter(database.Persona.user_address == user_address).first()
    if not db_persona:
        db_persona = database.Persona(user_address=user_address, cess_fid="pending", on_chain_hash="0x0")
        db.add(db_persona)
    if not db_persona.connection_id:
        db_persona.connection_id = str(uuid.uuid4())
    db.commit(); db.refresh(db_persona); return {"connection_id": db_persona.connection_id}

class ExtensionPersonaData(BaseModel):
    interests: List[str]
@app.post("/api/persona/update_from_extension")
async def update_persona_from_extension(data: ExtensionPersonaData, connection_id: str, db: Session = Depends(get_db)):
    db_persona = db.query(database.Persona).filter(database.Persona.connection_id == connection_id).first()
    if not db_persona: raise HTTPException(status_code=404, detail="ID de Conexão não encontrado.")
    db_persona.extension_interests = json.dumps(data.interests); db.commit()
    return {"status": "success", "message": "Interesses da extensão recebidos e guardados."}

class UserStatus(BaseModel):
    user_address: str; on_chain_hash: Optional[str]; reputation: int
@app.get("/api/extension/status", response_model=UserStatus)
async def get_extension_status(connection_id: str, db: Session = Depends(get_db)):
    db_persona = db.query(database.Persona).filter(database.Persona.connection_id == connection_id).first()
    if not db_persona: raise HTTPException(status_code=404, detail="ID de Conexão não encontrado.")
    user_address = db_persona.user_address
    try:
        persona_hash_bytes = core_contract.functions.personaHashes(user_address).call()
        persona_hash_hex = persona_hash_bytes.hex() if persona_hash_bytes else "0x0"
        reputation = core_contract.functions.userReputation(user_address).call()
        return {"user_address": user_address, "on_chain_hash": persona_hash_hex, "reputation": reputation}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erro ao comunicar com a blockchain.")
