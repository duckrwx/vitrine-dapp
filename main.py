import os
import json
import redis
import httpx
import requests
from fastapi import FastAPI, HTTPException, BackgroundTasks, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, Dict, List
from datetime import datetime, timedelta
from pydantic import BaseModel
import logging
import asyncio
from dotenv import load_dotenv

# Carrega variáveis de ambiente do arquivo .env
load_dotenv()

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Modelos de dados
class ProductMetadata(BaseModel):
    name: str
    description: str
    price: str
    commission: str
    tags: List[str]
    image_fid: str
    image_url: str
    created_at: str
    version: str = "1.0"

class CachedProduct(BaseModel):
    id: int
    seller: str
    price: str
    commission: str
    metadata_fid: str
    metadata: Optional[ProductMetadata] = None
    cached_at: Optional[datetime] = None
    image_url: str = ""

# Configuração
app = FastAPI(title="Vitrine DApp API")

# CORS
origins = ["*"] 
app.add_middleware(
    CORSMiddleware, 
    allow_origins=origins, 
    allow_credentials=True, 
    allow_methods=["*"], 
    allow_headers=["*"]
)

# Configurações CESS
CESS_GATEWAY_URL = os.getenv("CESS_GATEWAY_URL", "https://deoss-sgp.cess.network")
CESS_TERRITORY = os.getenv("CESS_TERRITORY", "Vitrine")
CESS_ACCOUNT = os.getenv("CESS_ACCOUNT", "cXh4NNAZKCtTEhZxVkJyBPcuHLV2WBqR89b2p6jQe4SyooFgc")
CESS_MESSAGE = os.getenv("CESS_MESSAGE", "abacate123")
CESS_SIGNATURE = os.getenv("CESS_SIGNATURE", "0x66ff396cc266c8531b77fa253b42e8d18cbdde65ca46afa76a2d98c8ea720f056f67c3b8c5449bf0dbb73404cec8d1683f66228b64cbf4e4ddd5ee36d104298b")

# Redis
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
METADATA_CACHE_TTL = 24 * 60 * 60  # 24 horas

try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    redis_client.ping()
    logger.info("Redis conectado com sucesso")
except Exception as e:
    logger.warning(f"Redis não disponível, usando cache em memória: {e}")
    redis_client = None

# Cache em memória como fallback
memory_cache: Dict[str, tuple[str, datetime]] = {}

# Rate limiting simples
upload_attempts = {}
RATE_LIMIT_REQUESTS = 10
RATE_LIMIT_WINDOW = 60  # segundos

def check_rate_limit(client_ip: str) -> bool:
    """Verifica rate limiting simples"""
    now = datetime.now()
    
    # Limpar entradas antigas
    for ip in list(upload_attempts.keys()):
        upload_attempts[ip] = [t for t in upload_attempts[ip] if now - t < timedelta(seconds=RATE_LIMIT_WINDOW)]
        if not upload_attempts[ip]:
            del upload_attempts[ip]
    
    # Verificar limite
    if client_ip in upload_attempts:
        if len(upload_attempts[client_ip]) >= RATE_LIMIT_REQUESTS:
            return False
    
    # Registrar tentativa
    if client_ip not in upload_attempts:
        upload_attempts[client_ip] = []
    upload_attempts[client_ip].append(now)
    
    return True

class MetadataCache:
    """Sistema de cache focado em metadados JSON"""
    
    @staticmethod
    def _get_cache_key(metadata_fid: str) -> str:
        return f"vitrine:metadata:{metadata_fid}"
    
    @staticmethod
    async def get(metadata_fid: str) -> Optional[Dict]:
        """Busca metadados do cache"""
        cache_key = MetadataCache._get_cache_key(metadata_fid)
        
        # Tenta Redis primeiro
        if redis_client:
            try:
                cached_data = redis_client.get(cache_key)
                if cached_data:
                    logger.info(f"Cache hit (Redis): {metadata_fid}")
                    return json.loads(cached_data)
            except Exception as e:
                logger.error(f"Erro ao buscar do Redis: {e}")
        
        # Fallback para memória
        if cache_key in memory_cache:
            data, expiry = memory_cache[cache_key]
            if datetime.now() < expiry:
                logger.info(f"Cache hit (Memory): {metadata_fid}")
                return json.loads(data)
            else:
                del memory_cache[cache_key]
        
        logger.info(f"Cache miss: {metadata_fid}")
        return None
    
    @staticmethod
    async def set(metadata_fid: str, metadata: Dict):
        """Armazena metadados no cache"""
        cache_key = MetadataCache._get_cache_key(metadata_fid)
        json_data = json.dumps(metadata)
        
        # Salva no Redis
        if redis_client:
            try:
                redis_client.setex(cache_key, METADATA_CACHE_TTL, json_data)
                logger.info(f"Cached to Redis: {metadata_fid}")
            except Exception as e:
                logger.error(f"Erro ao salvar no Redis: {e}")
        
        # Sempre salva na memória como backup
        expiry = datetime.now() + timedelta(seconds=METADATA_CACHE_TTL)
        memory_cache[cache_key] = (json_data, expiry)
        
        # Limita tamanho do cache em memória
        if len(memory_cache) > 1000:
            oldest_key = min(memory_cache.keys(), 
                           key=lambda k: memory_cache[k][1])
            del memory_cache[oldest_key]
    
    @staticmethod
    async def fetch_from_cess(metadata_fid: str) -> Optional[Dict]:
        """Busca metadados diretamente do CESS"""
        try:
            url = f"{CESS_GATEWAY_URL}/file/download/{metadata_fid}"
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                
                # Parse JSON
                metadata = response.json()
                
                # Adiciona URL direta da imagem se não existir
                if "image_fid" in metadata and "image_url" not in metadata:
                    metadata["image_url"] = f"{CESS_GATEWAY_URL}/file/download/{metadata['image_fid']}"
                
                return metadata
                
        except httpx.HTTPStatusError as e:
            logger.error(f"Erro HTTP ao buscar do CESS: {e.response.status_code}")
            raise HTTPException(status_code=404, detail=f"Metadados não encontrados: {metadata_fid}")
        except Exception as e:
            logger.error(f"Erro ao buscar metadados do CESS: {e}")
            raise HTTPException(status_code=500, detail="Erro ao buscar metadados")

# Endpoint principal de upload
@app.post("/api/upload-to-cess")
async def upload_proxy_to_cess(request: Request, file: UploadFile = File(...)):
    """
    Atua como um proxy seguro. Recebe um ficheiro do cliente,
    faz o upload para a CESS usando as chaves do servidor e devolve o FID.
    """
    # Rate limiting
    client_ip = request.client.host
    if not check_rate_limit(client_ip):
        logger.warning(f"Rate limit excedido para IP: {client_ip}")
        raise HTTPException(
            status_code=429,
            detail="Muitas requisições. Por favor, aguarde antes de tentar novamente."
        )
    
    logger.info(f"\n--- RECEBENDO ARQUIVO '{file.filename}' PARA UPLOAD PROXY ---")
    
    try:
        # Validações básicas
        MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
        file_bytes = await file.read()
        
        if len(file_bytes) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"Arquivo muito grande. Máximo permitido: {MAX_FILE_SIZE / 1024 / 1024}MB"
            )
        
        if len(file_bytes) == 0:
            raise HTTPException(
                status_code=400,
                detail="Arquivo vazio não é permitido"
            )
        
        # Headers para CESS
        headers = {
            'Territory': CESS_TERRITORY,
            'Account': CESS_ACCOUNT,
            'Message': CESS_MESSAGE,
            'Signature': CESS_SIGNATURE,
        }
        
        # Upload para CESS
        upload_url = f"{CESS_GATEWAY_URL}/file"
        files_payload = {
            'file': (file.filename, file_bytes, file.content_type)
        }
        
        logger.info(f"Enviando para CESS: {file.filename} ({len(file_bytes)} bytes)")
        
        response = requests.put(upload_url, headers=headers, files=files_payload, timeout=30)
        response.raise_for_status()
        
        response_json = response.json()
        file_id = response_json.get("data", {}).get("fid")
        
        if not file_id:
            logger.error(f"FID não encontrado na resposta: {response.text}")
            raise ValueError(f"O campo 'fid' não foi encontrado na resposta da CESS: {response.text}")
        
        logger.info(f"✅ Upload proxy para CESS bem-sucedido! FID retornado: {file_id}")
        
        return {"fid": file_id}
        
    except requests.exceptions.Timeout:
        logger.error("Timeout ao comunicar com CESS")
        raise HTTPException(
            status_code=504,
            detail="Timeout ao comunicar com servidor CESS"
        )
    except requests.exceptions.RequestException as e:
        logger.error(f"Erro de rede: {e}")
        raise HTTPException(
            status_code=503,
            detail="Erro ao comunicar com servidor CESS"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro no upload proxy para a CESS: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/metadata/{fid}")
async def get_metadata(fid: str):
    """
    Endpoint para buscar metadados do CESS
    """
    try:
        # Primeiro verifica o cache
        cached = await MetadataCache.get(fid)
        if cached:
            return cached
        
        # Se não está em cache, busca do CESS
        metadata = await MetadataCache.fetch_from_cess(fid)
        
        # Salva no cache para próximas requisições
        await MetadataCache.set(fid, metadata)
        
        return metadata
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar metadados: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar metadados")

@app.get("/api/products/batch")
async def get_products_batch(
    ids: str,  # IDs separados por vírgula: "0,1,2,3"
    background_tasks: BackgroundTasks
):
    """
    Busca múltiplos produtos de uma vez (otimizado para listas)
    """
    product_ids = [int(id.strip()) for id in ids.split(",") if id.strip()]
    products = []
    
    # Tasks assíncronas para buscar em paralelo
    async def fetch_product(product_id: int):
        try:
            # Simula dados do contrato
            metadata_fid = f"mock-metadata-{product_id}"
            
            # Tenta cache primeiro
            metadata = await MetadataCache.get(metadata_fid)
            
            if not metadata:
                # Busca do CESS se não estiver em cache
                metadata = await MetadataCache.fetch_from_cess(metadata_fid)
                # Agenda cache em background
                background_tasks.add_task(MetadataCache.set, metadata_fid, metadata)
            
            return {
                "id": product_id,
                "seller": f"0x{'0' * 38}{product_id:02d}",
                "price": metadata.get("price", "0"),
                "commission": metadata.get("commission", "0"),
                "metadata": metadata,
                "image_url": metadata.get("image_url", "")
            }
        except Exception as e:
            logger.error(f"Erro ao buscar produto {product_id}: {e}")
            return None
    
    # Busca todos em paralelo
    tasks = [fetch_product(pid) for pid in product_ids]
    results = await asyncio.gather(*tasks)
    
    # Filtra resultados válidos
    products = [p for p in results if p is not None]
    
    return {
        "products": products,
        "total": len(products),
        "requested": len(product_ids)
    }

@app.post("/api/cache/invalidate/{metadata_fid}")
async def invalidate_cache(metadata_fid: str):
    """
    Invalida cache de um metadata específico
    """
    cache_key = MetadataCache._get_cache_key(metadata_fid)
    
    # Remove do Redis
    if redis_client:
        try:
            redis_client.delete(cache_key)
        except Exception as e:
            logger.error(f"Erro ao invalidar Redis: {e}")
    
    # Remove da memória
    if cache_key in memory_cache:
        del memory_cache[cache_key]
    
    return {"status": "invalidated", "metadata_fid": metadata_fid}

@app.get("/api/cache/stats")
async def cache_stats():
    """
    Estatísticas do cache
    """
    stats = {
        "memory_cache_size": len(memory_cache),
        "redis_available": redis_client is not None
    }
    
    if redis_client:
        try:
            info = redis_client.info()
            stats["redis_memory_used"] = info.get("used_memory_human", "N/A")
            stats["redis_total_keys"] = redis_client.dbsize()
            
            # Conta apenas chaves do Vitrine
            vitrine_keys = 0
            for key in redis_client.scan_iter(match="vitrine:*"):
                vitrine_keys += 1
            stats["vitrine_cached_items"] = vitrine_keys
        except:
            pass
    
    return stats

@app.get("/api/health")
async def health_check():
    """Health check com status dos serviços"""
    
    # Verifica CESS
    cess_healthy = False
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.head(CESS_GATEWAY_URL)
            cess_healthy = response.status_code < 500
    except:
        pass
    
    # Verifica Redis
    redis_healthy = False
    if redis_client:
        try:
            redis_client.ping()
            redis_healthy = True
        except:
            pass
    
    return {
        "status": "healthy",
        "services": {
            "cess": cess_healthy,
            "redis": redis_healthy,
            "memory_cache": True
        },
        "timestamp": datetime.now().isoformat()
    }

@app.get("/")
async def root():
    """Endpoint raiz"""
    return {
        "message": "Vitrine DApp API funcionando!",
        "version": "2.0",
        "endpoints": {
            "upload": "/api/upload-to-cess",
            "metadata": "/api/product/{product_id}/metadata",
            "batch": "/api/products/batch",
            "health": "/api/health",
            "cache_stats": "/api/cache/stats"
        }
    }

# Middleware para logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = datetime.now()
    response = await call_next(request)
    process_time = (datetime.now() - start_time).total_seconds()
    
    logger.info(
        f"{request.client.host} - {request.method} {request.url.path} "
        f"- {response.status_code} - {process_time:.3f}s"
    )
    
    return response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
