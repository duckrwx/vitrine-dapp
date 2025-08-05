import os
import json
import hashlib
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
import asyncio
from contextlib import asynccontextmanager
import uuid
import re
from collections import Counter
import math

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, status, Request, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
import aiosqlite
from web3 import Web3
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables
VITRINE_CORE_ADDRESS = os.getenv("VITRINE_CORE_ADDRESS")
MARKETPLACE_ADDRESS = os.getenv("MARKETPLACE_ADDRESS")
DEPLOYER_PRIVATE_KEY = os.getenv("DEPLOYER_PRIVATE_KEY")
DATABASE_URL = os.getenv("DATABASE_URL", "vitrine.db")

# CESS Configuration
CESS_GATEWAY_URL = os.getenv("CESS_GATEWAY_URL", "https://deoss-sgp.cess.network")
CESS_TERRITORY = os.getenv("CESS_TERRITORY", "Vitrine")
CESS_ACCOUNT = os.getenv("CESS_ACCOUNT", "cXh4NNAZKCtTEhZxVkJyBPcuHLV2WBqR89b2p6jQe4SyooFgc")
CESS_MESSAGE = os.getenv("CESS_MESSAGE", "abacate123")
CESS_SIGNATURE = os.getenv("CESS_SIGNATURE", "0x66ff396cc266c8531b77fa253b42e8d18cbdde65ca46afa76a2d98c8ea720f056f67c3b8c5449bf0dbb73404cec8d1683f66228b64cbf4e4ddd5ee36d104298b")

# Initialize Web3
w3 = Web3(Web3.HTTPProvider('http://localhost:8545'))  # Local Hardhat node

# Security
security = HTTPBearer()

# Rate limiting
upload_attempts = {}
RATE_LIMIT_REQUESTS = 10
RATE_LIMIT_WINDOW = 60  # seconds

# Cache em memória para metadados CESS
memory_cache: Dict[str, tuple[str, datetime]] = {}
METADATA_CACHE_TTL = 24 * 60 * 60  # 24 hours

# Pydantic Models
class Demographics(BaseModel):
    age_range: str = Field(..., description="Age range of the user")
    location: str = Field(..., description="User's location")
    language: str = Field(..., description="User's preferred language")

class BrowseData(BaseModel):
    categories: List[str] = Field(..., description="Website categories user visits")
    time_spent: Dict[str, float] = Field(default_factory=dict, description="Time spent per category")
    devices: List[str] = Field(default_factory=list, description="Devices used for Browse")

class Preferences(BaseModel):
    ad_types: List[str] = Field(default_factory=list, description="Preferred ad types")
    content_formats: List[str] = Field(default_factory=list, description="Preferred content formats")
    shopping_habits: List[str] = Field(default_factory=list, description="Shopping behavior patterns")

class PersonaData(BaseModel):
    interests: List[str] = Field(..., description="User's interests")
    demographics: Demographics
    Browse: BrowseData
    preferences: Preferences

class PersonaRequest(BaseModel):
    user_address: str = Field(..., description="User's wallet address")
    persona_data: PersonaData

class CampaignClickRequest(BaseModel):
    campaign_id: str = Field(..., description="Campaign identifier")
    user_address: str = Field(..., description="User's wallet address")

class StreamerApplicationRequest(BaseModel):
    user_address: str = Field(..., description="User's wallet address")
    reputation_score: int = Field(..., description="Current reputation score")
    proposed_commission: float = Field(..., description="Proposed commission percentage")
    
class ExtensionSyncRequest(BaseModel):
    user_address: str = Field(..., description="User's wallet address")
    Browse_data: Dict[str, Any] = Field(..., description="Browse data from extension")
    timestamp: int = Field(..., description="Timestamp of data collection")

class SimplePersonaProcessor:
    """Simple persona processor using rule-based logic without ML dependencies"""
    
    def __init__(self):
        # Predefined categories and mappings
        self.interest_categories = {
            "technology": ["tecnologia", "tech", "programação", "software", "hardware", "ai", "blockchain"],
            "sports": ["esportes", "futebol", "basquete", "academia", "fitness", "corrida"],
            "entertainment": ["música", "cinema", "jogos", "netflix", "streaming", "arte"],
            "fashion": ["moda", "roupas", "beleza", "estilo", "tendências"],
            "food": ["gastronomia", "culinária", "receitas", "restaurantes", "comida"],
            "travel": ["viagem", "turismo", "destinos", "hotéis", "aventura"],
            "health": ["saúde", "medicina", "bem-estar", "exercícios", "nutrição"],
            "finance": ["finanças", "investimentos", "economia", "dinheiro", "cripto"],
            "education": ["educação", "cursos", "aprendizado", "estudo", "livros"],
            "lifestyle": ["lifestyle", "casa", "decoração", "família", "relacionamentos"]
        }
        
        self.demographic_segments = {
            "18-24": "gen_z",
            "25-34": "millennial_young",
            "35-44": "millennial_old",
            "45-54": "gen_x",
            "55-64": "boomer_young",
            "65+": "boomer_old"
        }
        
        self.location_tiers = {
            "são paulo": "tier_1_metro",
            "rio de janeiro": "tier_1_metro",
            "brasília": "tier_1_capital",
            "salvador": "tier_1_capital",
            "fortaleza": "tier_1_capital",
            "belo horizonte": "tier_1_capital",
            "curitiba": "tier_1_capital",
            "recife": "tier_1_capital",
            "porto alegre": "tier_1_capital"
        }
    
    def _calculate_text_similarity(self, text1: str, text2: str) -> float:
        """Calculate simple text similarity without scikit-learn"""
        try:
            # Convert to lowercase and split into words
            words1 = set(text1.lower().split())
            words2 = set(text2.lower().split())
            
            # Calculate Jaccard similarity
            intersection = len(words1.intersection(words2))
            union = len(words1.union(words2))
            
            if union == 0:
                return 0.0
            
            return intersection / union
        except:
            return 0.0
    
    async def process_persona(self, persona_data: PersonaData) -> Dict[str, Any]:
        """Process raw persona data using simple algorithms"""
        try:
            # 1. Anonymize personal data
            anonymized_demographics = self._anonymize_demographics(persona_data.demographics)
            
            # 2. Categorize interests using keyword matching
            interest_profile = self._categorize_interests(persona_data.interests)
            
            # 3. Analyze Browse patterns
            Browse_profile = self._analyze_Browse_patterns(persona_data.Browse)
            
            # 4. Generate preference vectors
            preference_profile = self._generate_preference_vectors(persona_data.preferences)
            
            # 5. Create simple audience segments
            audience_segments = self._generate_simple_segments(
                anonymized_demographics, interest_profile, Browse_profile, preference_profile
            )
            
            # 6. Calculate targeting scores
            targeting_scores = self._calculate_targeting_scores(
                interest_profile, Browse_profile, preference_profile
            )
            
            processed_persona = {
                "id": str(uuid.uuid4()),
                "anonymized_demographics": anonymized_demographics,
                "interest_profile": interest_profile,
                "Browse_profile": Browse_profile,
                "preference_profile": preference_profile,
                "audience_segments": audience_segments,
                "targeting_scores": targeting_scores,
                "privacy_level": "high",
                "processing_method": "rule_based",
                "created_at": datetime.utcnow().isoformat(),
                "version": "1.0"
            }
            
            return processed_persona
            
        except Exception as e:
            logger.error(f"Error processing persona: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to process persona data")
    
    def _anonymize_demographics(self, demographics: Demographics) -> Dict[str, Any]:
        """Anonymize demographic data using simple rules"""
        # Age segment mapping
        age_segment = self.demographic_segments.get(demographics.age_range, "unknown")
        
        # Location tier mapping
        location_lower = demographics.location.lower()
        market_tier = "tier_3_other"  # Default
        region = "other"
        
        for city, tier in self.location_tiers.items():
            if city in location_lower:
                market_tier = tier
                if "são paulo" in location_lower or "rio" in location_lower:
                    region = "southeast"
                elif "brasília" in location_lower:
                    region = "center_west"
                elif "salvador" in location_lower or "recife" in location_lower:
                    region = "northeast"
                else:
                    region = "other"
                break
        
        # Urban classification (simple heuristic)
        urban_rural = "urban" if any(city in location_lower for city in self.location_tiers.keys()) else "suburban"
        
        # Language group
        language_groups = {
            "português": "portuguese_br",
            "english": "english",
            "español": "spanish",
            "français": "french"
        }
        language_group = language_groups.get(demographics.language.lower(), "other")
        
        return {
            "age_segment": age_segment,
            "market_tier": market_tier,
            "region": region,
            "language_group": language_group,
            "urban_rural": urban_rural
        }
    
    def _categorize_interests(self, interests: List[str]) -> Dict[str, Any]:
        """Categorize interests using keyword matching"""
        if not interests:
            return {"categories": [], "scores": {}, "primary_category": "general"}
        
        # Convert interests to lowercase for matching
        interests_text = " ".join(interests).lower()
        
        # Score each category based on keyword matches
        category_scores = {}
        for category, keywords in self.interest_categories.items():
            score = 0
            for keyword in keywords:
                if keyword in interests_text:
                    score += 1
                # Boost score for exact matches in interest list
                for interest in interests:
                    if keyword.lower() == interest.lower().strip():
                        score += 2
            
            if score > 0:
                category_scores[category] = score / len(keywords)  # Normalize by keyword count
        
        # Get top categories
        sorted_categories = sorted(category_scores.items(), key=lambda x: x[1], reverse=True)
        top_categories = [cat[0] for cat in sorted_categories[:5]]
        
        # Calculate diversity score
        diversity = len(set(interests)) / len(interests) if interests else 0
        
        return {
            "categories": top_categories,
            "scores": dict(sorted_categories),
            "primary_category": top_categories[0] if top_categories else "general",
            "diversity_score": diversity,
            "total_interests": len(interests)
        }
    
    def _analyze_Browse_patterns(self, Browse: BrowseData) -> Dict[str, Any]:
        """Analyze Browse patterns using simple metrics"""
        total_time = sum(Browse.time_spent.values()) if Browse.time_spent else 1
        
        # Category preferences based on time spent
        category_preferences = {}
        if Browse.time_spent:
            for category, time in Browse.time_spent.items():
                category_preferences[category] = time / total_time
        
        # Device usage analysis
        device_profile = {
            "primary_device": "mobile" if "Mobile" in Browse.devices else "desktop",
            "is_multi_device": len(Browse.devices) > 1,
            "device_count": len(Browse.devices),
            "mobile_usage": 1.0 if "Mobile" in Browse.devices else 0.0
        }
        
        # Browse behavior classification
        hours_per_day = total_time / 24 if total_time > 0 else 0
        if hours_per_day > 6:
            engagement_level = "heavy"
        elif hours_per_day > 3:
            engagement_level = "medium"
        elif hours_per_day > 1:
            engagement_level = "light"
        else:
            engagement_level = "minimal"
        
        # Category diversity
        category_diversity = len(set(Browse.categories)) if Browse.categories else 0
        
        return {
            "category_preferences": category_preferences,
            "device_profile": device_profile,
            "engagement_level": engagement_level,
            "hours_per_day": round(hours_per_day, 2),
            "category_diversity": category_diversity,
            "top_category": max(category_preferences.items(), key=lambda x: x[1])[0] if category_preferences else None
        }
    
    def _generate_preference_vectors(self, preferences: Preferences) -> Dict[str, Any]:
        """Generate preference vectors using simple mapping"""
        # Ad type preferences
        ad_preferences = {
            "visual_ads": 1.0 if any(ad in ["Display Banners", "Vídeos", "Infográficos"] 
                                      for ad in preferences.ad_types) else 0.0,
            "social_ads": 1.0 if any(ad in ["Social Media", "Influencer Marketing"] 
                                      for ad in preferences.ad_types) else 0.0,
            "native_ads": 1.0 if "Native Ads" in preferences.ad_types else 0.0,
            "video_ads": 1.0 if "Vídeos" in preferences.ad_types else 0.0
        }
        
        # Content preferences
        content_preferences = {
            "text_content": 1.0 if "Artigos" in preferences.content_formats else 0.0,
            "video_content": 1.0 if "Vídeos" in preferences.content_formats else 0.0,
            "audio_content": 1.0 if "Podcasts" in preferences.content_formats else 0.0,
            "interactive_content": 1.0 if any(fmt in ["Lives", "Stories"] 
                                              for fmt in preferences.content_formats) else 0.0
        }
        
        # Shopping behavior
        shopping_behavior = {
            "impulse_buyer": 1.0 if "Compra por impulso" in preferences.shopping_habits else 0.0,
            "price_conscious": 1.0 if any(habit in ["Pesquisa preços", "Promoções"] 
                                           for habit in preferences.shopping_habits) else 0.0,
            "brand_loyal": 1.0 if "Fidelidade a marcas" in preferences.shopping_habits else 0.0,
            "quality_focused": 1.0 if "Qualidade premium" in preferences.shopping_habits else 0.0,
            "eco_conscious": 1.0 if "Sustentabilidade" in preferences.shopping_habits else 0.0
        }
        
        # Calculate overall preference strength
        total_preferences = (sum(ad_preferences.values()) + 
                             sum(content_preferences.values()) + 
                             sum(shopping_behavior.values()))
        
        return {
            "ad_preferences": ad_preferences,
            "content_preferences": content_preferences,
            "shopping_behavior": shopping_behavior,
            "preference_strength": total_preferences,
            "has_strong_preferences": total_preferences > 5
        }
    
    def _generate_simple_segments(self, demographics: Dict, interests: Dict, 
                                 Browse: Dict, preferences: Dict) -> Dict[str, Any]:
        """Generate audience segments using rule-based logic"""
        segments = []
        confidence_scores = {}
        
        # Tech-savvy segment
        tech_score = interests.get("scores", {}).get("technology", 0)
        if tech_score > 0.3 or Browse.get("device_profile", {}).get("is_multi_device", False):
            segments.append("tech_enthusiast")
            confidence_scores["tech_enthusiast"] = min(tech_score + 0.3, 1.0)
        
        # Shopping segment
        shopping_score = preferences.get("shopping_behavior", {}).get("impulse_buyer", 0)
        shopping_score += preferences.get("shopping_behavior", {}).get("price_conscious", 0)
        if shopping_score > 0.5:
            segments.append("active_shopper")
            confidence_scores["active_shopper"] = shopping_score
        
        # Content consumer segment
        content_score = sum(preferences.get("content_preferences", {}).values())
        if content_score > 1.5:
            segments.append("content_consumer")
            confidence_scores["content_consumer"] = min(content_score / 4, 1.0)
        
        # Mobile-first segment
        if Browse.get("device_profile", {}).get("mobile_usage", 0) > 0:
            segments.append("mobile_user")
            confidence_scores["mobile_user"] = Browse.get("device_profile", {}).get("mobile_usage", 0)
        
        # High-engagement segment
        if Browse.get("engagement_level") in ["heavy", "medium"]:
            segments.append("engaged_user")
            confidence_scores["engaged_user"] = 0.8 if Browse.get("engagement_level") == "heavy" else 0.6
        
        # Premium segment
        if preferences.get("shopping_behavior", {}).get("quality_focused", 0) > 0:
            segments.append("premium_consumer")
            confidence_scores["premium_consumer"] = preferences.get("shopping_behavior", {}).get("quality_focused", 0)
        
        # Default segment if none match
        if not segments:
            segments = ["general_audience"]
            confidence_scores["general_audience"] = 0.5
        
        return {
            "segments": segments,
            "primary_segment": segments[0] if segments else "general_audience",
            "confidence_scores": confidence_scores,
            "segment_count": len(segments)
        }
    
    def _calculate_targeting_scores(self, interests: Dict, Browse: Dict, preferences: Dict) -> Dict[str, float]:
        """Calculate targeting scores for different campaign types"""
        scores = {}
        
        # Technology targeting
        tech_score = interests.get("scores", {}).get("technology", 0) * 0.7
        if Browse.get("device_profile", {}).get("is_multi_device", False):
            tech_score += 0.3
        scores["technology"] = min(tech_score, 1.0)
        
        # E-commerce targeting
        ecommerce_score = preferences.get("shopping_behavior", {}).get("impulse_buyer", 0) * 0.4
        ecommerce_score += preferences.get("shopping_behavior", {}).get("price_conscious", 0) * 0.6
        scores["ecommerce"] = min(ecommerce_score, 1.0)
        
        # Entertainment targeting
        entertainment_score = interests.get("scores", {}).get("entertainment", 0) * 0.6
        entertainment_score += preferences.get("content_preferences", {}).get("video_content", 0) * 0.4
        scores["entertainment"] = min(entertainment_score, 1.0)
        
        # Fashion targeting
        fashion_score = interests.get("scores", {}).get("fashion", 0) * 0.8
        if preferences.get("shopping_behavior", {}).get("brand_loyal", 0) > 0:
            fashion_score += 0.2
        scores["fashion"] = min(fashion_score, 1.0)
        
        # Health targeting
        health_score = interests.get("scores", {}).get("health", 0) * 0.7
        if "fitness" in str(interests.get("categories", [])).lower():
            health_score += 0.3
        scores["health"] = min(health_score, 1.0)
        
        # Finance targeting
        finance_score = interests.get("scores", {}).get("finance", 0) * 0.9
        scores["finance"] = min(finance_score, 1.0)
        
        # Default minimum scores for basic targeting
        for category in ["technology", "ecommerce", "entertainment", "fashion", "health", "finance"]:
            if scores.get(category, 0) == 0:
                scores[category] = 0.1  # Minimum targeting possibility
        
        return scores

class CESSStorageManager:
    """Enhanced CESS storage manager with full API integration"""
    
    def __init__(self):
        self.gateway_url = CESS_GATEWAY_URL
        self.territory = CESS_TERRITORY
        self.account = CESS_ACCOUNT
        self.message = CESS_MESSAGE
        self.signature = CESS_SIGNATURE
    
    def _get_cess_headers(self) -> Dict[str, str]:
        """Get headers for CESS API requests"""
        return {
            'Territory': self.territory,
            'Account': self.account,
            'Message': self.message,
            'Signature': self.signature,
        }
    
    async def store_persona(self, persona_data: Dict[str, Any]) -> Dict[str, str]:
        """Store persona data in CESS network and return FID"""
        try:
            # Convert persona to JSON
            persona_json = json.dumps(persona_data, sort_keys=True, ensure_ascii=False)
            
            # Create hash of the data
            persona_hash = hashlib.sha256(persona_json.encode()).hexdigest()
            
            # Upload to CESS
            fid = await self._upload_to_cess(persona_json.encode(), f"persona_{persona_hash}.json", "application/json")
            
            # Store reference in local database for quick access
            await self._store_persona_reference(persona_hash, fid, persona_data.get("user_address"))
            
            return {
                "hash": f"0x{persona_hash}",
                "fid": fid,
                "storage_provider": "cess"
            }
            
        except Exception as e:
            logger.error(f"CESS storage failed: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to store persona in CESS")
    
    async def store_product_metadata(self, metadata: Dict[str, Any]) -> str:
        """Store product metadata in CESS and return FID"""
        try:
            metadata_json = json.dumps(metadata, sort_keys=True, ensure_ascii=False)
            fid = await self._upload_to_cess(
                metadata_json.encode(), 
                f"product_metadata_{uuid.uuid4().hex[:8]}.json", 
                "application/json"
            )
            
            # Cache metadata
            await self._cache_metadata(fid, metadata)
            
            return fid
            
        except Exception as e:
            logger.error(f"Error storing product metadata: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to store product metadata")
    
    async def store_campaign_data(self, campaign_data: Dict[str, Any]) -> str:
        """Store campaign data in CESS and return FID"""
        try:
            campaign_json = json.dumps(campaign_data, sort_keys=True, ensure_ascii=False)
            fid = await self._upload_to_cess(
                campaign_json.encode(), 
                f"campaign_{uuid.uuid4().hex[:8]}.json", 
                "application/json"
            )
            
            return fid
            
        except Exception as e:
            logger.error(f"Error storing campaign data: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to store campaign data")
    
    async def _upload_to_cess(self, data: bytes, filename: str, content_type: str) -> str:
        """Upload data to CESS network"""
        try:
            headers = self._get_cess_headers()
            upload_url = f"{self.gateway_url}/file"
            
            files_payload = {
                'file': (filename, data, content_type)
            }
            
            logger.info(f"Uploading to CESS: {filename} ({len(data)} bytes)")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.put(upload_url, headers=headers, files=files_payload)
                response.raise_for_status()
                
                response_json = response.json()
                file_id = response_json.get("data", {}).get("fid")
                
                if not file_id:
                    raise ValueError(f"FID not found in CESS response: {response.text}")
                
                logger.info(f"✅ CESS upload successful! FID: {file_id}")
                return file_id
                
        except httpx.HTTPStatusError as e:
            logger.error(f"CESS HTTP error: {e.response.status_code}")
            raise HTTPException(status_code=503, detail="CESS network error")
        except Exception as e:
            logger.error(f"CESS upload error: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to upload to CESS")
    
    async def retrieve_from_cess(self, fid: str) -> Dict[str, Any]:
        """Retrieve data from CESS network by FID"""
        try:
            # Check cache first
            cached = await self._get_cached_metadata(fid)
            if cached:
                return cached
            
            # Fetch from CESS
            url = f"{self.gateway_url}/file/download/{fid}"
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                
                # Parse JSON
                data = response.json()
                
                # Cache for future requests
                await self._cache_metadata(fid, data)
                
                return data
                
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                raise HTTPException(status_code=404, detail=f"Data not found in CESS: {fid}")
            logger.error(f"CESS HTTP error: {e.response.status_code}")
            raise HTTPException(status_code=503, detail="CESS network error")
        except Exception as e:
            logger.error(f"Error retrieving from CESS: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to retrieve from CESS")
    
    async def _store_persona_reference(self, persona_hash: str, fid: str, user_address: str = None):
        """Store persona reference in local database"""
        async with aiosqlite.connect(DATABASE_URL) as db:
            await db.execute("""
                INSERT OR REPLACE INTO personas (hash, fid, user_address, data, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (persona_hash, fid, user_address, json.dumps({"fid": fid}), datetime.utcnow().isoformat()))
            await db.commit()
    
    async def _cache_metadata(self, fid: str, metadata: Dict[str, Any]):
        """Cache metadata in memory"""
        cache_key = f"cess_metadata:{fid}"
        json_data = json.dumps(metadata)
        expiry = datetime.now() + timedelta(seconds=METADATA_CACHE_TTL)
        memory_cache[cache_key] = (json_data, expiry)
        
        # Limit cache size
        if len(memory_cache) > 1000:
            oldest_key = min(memory_cache.keys(), key=lambda k: memory_cache[k][1])
            del memory_cache[oldest_key]
    
    async def _get_cached_metadata(self, fid: str) -> Optional[Dict[str, Any]]:
        """Get cached metadata"""
        cache_key = f"cess_metadata:{fid}"
        
        if cache_key in memory_cache:
            data, expiry = memory_cache[cache_key]
            if datetime.now() < expiry:
                logger.info(f"Cache hit: {fid}")
                return json.loads(data)
            else:
                del memory_cache[cache_key]
        
        return None

def check_rate_limit(client_ip: str) -> bool:
    """Simple rate limiting check"""
    now = datetime.now()
    
    # Clean old entries
    for ip in list(upload_attempts.keys()):
        upload_attempts[ip] = [t for t in upload_attempts[ip] if now - t < timedelta(seconds=RATE_LIMIT_WINDOW)]
        if not upload_attempts[ip]:
            del upload_attempts[ip]
    
    # Check limit
    if client_ip in upload_attempts:
        if len(upload_attempts[client_ip]) >= RATE_LIMIT_REQUESTS:
            return False
    
    # Register attempt
    if client_ip not in upload_attempts:
        upload_attempts[client_ip] = []
    upload_attempts[client_ip].append(now)
    
    return True

class DatabaseManager:
    """Database operations manager"""
    
    @staticmethod
    async def init_database():
        """Initialize SQLite database with required tables"""
        async with aiosqlite.connect(DATABASE_URL) as db:
            # Personas table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS personas (
                    hash TEXT PRIMARY KEY,
                    fid TEXT UNIQUE NOT NULL,
                    user_address TEXT NOT NULL,
                    data TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # User stats table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS user_stats (
                    user_address TEXT PRIMARY KEY,
                    reputation_score INTEGER DEFAULT 0,
                    total_earnings TEXT DEFAULT '0',
                    total_interactions INTEGER DEFAULT 0,
                    last_persona_update TEXT,
                    created_at TEXT NOT NULL
                )
            """)
            
            # Transactions table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS transactions (
                    id TEXT PRIMARY KEY,
                    user_address TEXT NOT NULL,
                    type TEXT NOT NULL,
                    amount TEXT NOT NULL,
                    description TEXT NOT NULL,
                    status TEXT DEFAULT 'pending',
                    timestamp TEXT NOT NULL
                )
            """)
            
            # Campaigns table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS campaigns (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    budget TEXT NOT NULL,
                    cpc TEXT NOT NULL,
                    target_segments TEXT NOT NULL,
                    status TEXT DEFAULT 'active',
                    created_at TEXT NOT NULL
                )
            """)
            
            # Campaign interactions table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS campaign_interactions (
                    id TEXT PRIMARY KEY,
                    campaign_id TEXT NOT NULL,
                    user_address TEXT NOT NULL,
                    interaction_type TEXT NOT NULL,
                    reward_amount TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    FOREIGN KEY (campaign_id) REFERENCES campaigns (id)
                )
            """)
            
            # Streamer applications table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS streamer_applications (
                    user_address TEXT PRIMARY KEY,
                    reputation_score INTEGER NOT NULL,
                    proposed_commission REAL NOT NULL,
                    status TEXT DEFAULT 'pending',
                    applied_at TEXT NOT NULL,
                    reviewed_at TEXT
                )
            """)
            
            # Products table (for marketplace)
            await db.execute("""
                CREATE TABLE IF NOT EXISTS products (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL,
                    price TEXT NOT NULL,
                    seller_address TEXT NOT NULL,
                    category TEXT NOT NULL,
                    image_url TEXT,
                    target_segments TEXT,
                    status TEXT DEFAULT 'active',
                    created_at TEXT NOT NULL
                )
            """)
            
            await db.commit()
    
    @staticmethod
    async def get_user_stats(user_address: str) -> Optional[Dict[str, Any]]:
        """Get user statistics"""
        async with aiosqlite.connect(DATABASE_URL) as db:
            async with db.execute("""
                SELECT * FROM user_stats WHERE user_address = ?
            """, (user_address,)) as cursor:
                row = await cursor.fetchone()
                if row:
                    return {
                        "user_address": row[0],
                        "reputation_score": row[1],
                        "total_earnings": row[2],
                        "total_interactions": row[3],
                        "last_persona_update": row[4],
                        "created_at": row[5]
                    }
                return None
    
    @staticmethod
    async def update_user_stats(user_address: str, **kwargs):
        """Update user statistics"""
        async with aiosqlite.connect(DATABASE_URL) as db:
            # Check if user exists
            stats = await DatabaseManager.get_user_stats(user_address)
            
            if stats:
                # Update existing user
                set_clauses = []
                values = []
                for key, value in kwargs.items():
                    set_clauses.append(f"{key} = ?")
                    values.append(value)
                
                if set_clauses:
                    query = f"UPDATE user_stats SET {', '.join(set_clauses)} WHERE user_address = ?"
                    values.append(user_address)
                    await db.execute(query, values)
            else:
                # Create new user
                await db.execute("""
                    INSERT INTO user_stats (user_address, created_at, reputation_score, total_earnings, total_interactions)
                    VALUES (?, ?, ?, ?, ?)
                """, (user_address, datetime.utcnow().isoformat(), 
                      kwargs.get('reputation_score', 0),
                      kwargs.get('total_earnings', '0'),
                      kwargs.get('total_interactions', 0)))
            
            await db.commit()

# Initialize components
persona_processor = SimplePersonaProcessor()
storage_manager = CESSStorageManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await DatabaseManager.init_database()
    logger.info("Database initialized")
    yield
    # Shutdown
    logger.info("Application shutdown")

# FastAPI app
app = FastAPI(
    title="Vitrine dApp Backend",
    description="Backend API for Vitrine decentralized advertising platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routes ---

@app.get("/")
async def root():
    return {
        "message": "Vitrine dApp Backend API", 
        "version": "2.0.0",
        "processing": "rule_based",
        "storage": "cess_decentralized",
        "ai_enabled": False,
        "cess_gateway": CESS_GATEWAY_URL,
        "endpoints": {
            "personas": "/api/persona/create",
            "marketplace": "/api/marketplace/recommendations/{address}",
            "campaigns": "/api/campaigns/available/{address}",
            "cess_upload": "/api/upload-to-cess",
            "cess_metadata": "/api/cess/metadata/{fid}",
            "health": "/health",
            "docs": "/docs"
        }
    }

@app.post("/api/persona/create")
async def create_persona(request: PersonaRequest, background_tasks: BackgroundTasks):
    """Create or update user persona with simple rule-based processing"""
    try:
        # Process persona data with simple algorithms
        processed_persona = await persona_processor.process_persona(request.persona_data)
        
        # Store in CESS network
        storage_result = await storage_manager.store_persona(processed_persona)
        
        # Update user stats
        await DatabaseManager.update_user_stats(
            request.user_address,
            last_persona_update=datetime.utcnow().isoformat(),
            reputation_score=10  # Reward for creating/updating persona
        )
        
        # Store persona association with CESS FID
        async with aiosqlite.connect(DATABASE_URL) as db:
            await db.execute("""
                INSERT OR REPLACE INTO personas (hash, fid, user_address, data, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (
                storage_result["hash"].replace("0x", ""),
                storage_result["fid"],
                request.user_address,
                json.dumps({"fid": storage_result["fid"], "cess_stored": True}),
                datetime.utcnow().isoformat()
            ))
            await db.commit()
        
        return {
            "success": True,
            "hash": storage_result["hash"],
            "fid": storage_result["fid"],
            "processing_method": "rule_based",
            "storage_provider": "cess",
            "message": "Persona created and stored in CESS successfully"
        }
        
    except Exception as e:
        logger.error(f"Error creating persona: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/persona/stats/{user_address}")
async def get_persona_stats(user_address: str):
    """Get persona statistics for a user"""
    try:
        async with aiosqlite.connect(DATABASE_URL) as db:
            # Get persona data
            async with db.execute("""
                SELECT hash, fid, created_at, data FROM personas WHERE user_address = ?
            """, (user_address,)) as cursor:
                persona_row = await cursor.fetchone()
            
            if not persona_row:
                raise HTTPException(status_code=404, detail="Persona not found")
            
            # Get user stats
            user_stats = await DatabaseManager.get_user_stats(user_address)
            
            # Calculate earnings this month
            month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            async with db.execute("""
                SELECT SUM(CAST(amount AS REAL)) FROM transactions 
                WHERE user_address = ? AND type != 'purchase' 
                AND timestamp >= ? AND status = 'completed'
            """, (user_address, month_start.isoformat())) as cursor:
                earnings_row = await cursor.fetchone()
            
            monthly_earnings = earnings_row[0] or 0
            
            # Count matching campaigns (simplified)
            async with db.execute("""
                SELECT COUNT(*) FROM campaigns WHERE status = 'active'
            """, ()) as cursor:
                campaigns_row = await cursor.fetchone()
            
            matching_campaigns = campaigns_row[0] or 0
            
            return {
                "hash": f"0x{persona_row[0]}",
                "fid": persona_row[1],
                "lastUpdated": persona_row[2],
                "matchingCampaigns": matching_campaigns,
                "earningsThisMonth": str(int(monthly_earnings * 10**18)),  # Convert to wei
                "reputationScore": user_stats["reputation_score"] if user_stats else 0,
                "totalInteractions": user_stats["total_interactions"] if user_stats else 0
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting persona stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/marketplace/recommendations/{user_address}")
async def get_product_recommendations(user_address: str):
    """Get personalized product recommendations"""
    try:
        async with aiosqlite.connect(DATABASE_URL) as db:
            # Get user's persona
            async with db.execute("""
                SELECT data FROM personas WHERE user_address = ?
            """, (user_address,)) as cursor:
                persona_row = await cursor.fetchone()
            
            if not persona_row:
                # Return default products if no persona
                async with db.execute("""
                    SELECT id, name, description, price, seller_address, category, image_url
                    FROM products WHERE status = 'active' LIMIT 6
                """) as cursor:
                    products = await cursor.fetchall()
                
                return [
                    {
                        "id": product[0],
                        "name": product[1],
                        "description": product[2],
                        "price": product[3],
                        "seller": product[4],
                        "category": product[5],
                        "imageUrl": product[6] or "",
                        "personalityMatch": 50,  # Default match
                        "sponsored": False
                    }
                    for product in products
                ]
            
            # Parse persona data
            # First, try to get FID from the stored data
            try:
                stored_info = json.loads(persona_row[0])
                fid = stored_info.get("fid")
                if not fid:
                    raise ValueError("FID not found in persona data")
                
                # Retrieve full persona from CESS
                persona_data = await storage_manager.retrieve_from_cess(fid)

            except (json.JSONDecodeError, ValueError) as e:
                 raise HTTPException(status_code=500, detail=f"Could not retrieve or parse persona data from storage: {e}")

            targeting_scores = persona_data.get("targeting_scores", {})
            
            # Get products with matching segments
            async with db.execute("""
                SELECT id, name, description, price, seller_address, category, image_url, target_segments
                FROM products WHERE status = 'active'
            """) as cursor:
                all_products = await cursor.fetchall()
            
            # Calculate match scores for each product
            recommendations = []
            for product in all_products:
                match_score = await calculate_product_match(product, targeting_scores, persona_data)
                
                recommendations.append({
                    "id": product[0],
                    "name": product[1],
                    "description": product[2],
                    "price": product[3],
                    "seller": product[4],
                    "category": product[5],
                    "imageUrl": product[6] or "",
                    "personalityMatch": int(match_score * 100),
                    "sponsored": match_score > 0.7  # High match products are "sponsored"
                })
            
            # Sort by match score and return top 6
            recommendations.sort(key=lambda x: x["personalityMatch"], reverse=True)
            return recommendations[:6]
            
    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def calculate_product_match(product: tuple, targeting_scores: Dict[str, float], persona_data: Dict[str, Any]) -> float:
    """Calculate how well a product matches a user's persona using simple rules"""
    try:
        product_segments = json.loads(product[7] or "[]")
        category = product[5].lower()
        
        # Base match from targeting scores
        base_match = 0.3  # Default minimum
        
        # Category-based matching
        if "tech" in category or "tecnologia" in category:
            base_match = targeting_scores.get("technology", 0.3)
        elif "moda" in category or "fashion" in category:
            base_match = targeting_scores.get("fashion", 0.3)
        elif "casa" in category or "home" in category:
            base_match = targeting_scores.get("health", 0.3)  # Assuming health includes lifestyle
        elif "eletronic" in category or "eletronico" in category:
            base_match = targeting_scores.get("technology", 0.3)
        else:
            base_match = targeting_scores.get("ecommerce", 0.4)
        
        # Boost based on audience segments
        audience_segments = persona_data.get("audience_segments", {}).get("segments", [])
        segment_boost = 0.0
        for segment in product_segments:
            if segment in audience_segments:
                segment_boost += 0.2
        
        # Interest matching
        interest_categories = persona_data.get("interest_profile", {}).get("categories", [])
        interest_boost = 0.0
        for interest in interest_categories:
            if interest.lower() in category or category in interest.lower():
                interest_boost += 0.3
        
        final_score = min(base_match + segment_boost + interest_boost, 1.0)
        return max(final_score, 0.1)  # Minimum 10% match
        
    except Exception as e:
        logger.error(f"Error calculating product match: {str(e)}")
        return 0.3  # Default match

@app.get("/api/campaigns/available/{user_address}")
async def get_available_campaigns(user_address: str):
    """Get campaigns available for a user based on their persona"""
    try:
        async with aiosqlite.connect(DATABASE_URL) as db:
            # Get user's persona
            async with db.execute("""
                SELECT data FROM personas WHERE user_address = ?
            """, (user_address,)) as cursor:
                persona_row = await cursor.fetchone()
            
            # Get all active campaigns
            async with db.execute("""
                SELECT id, title, description, budget, cpc, target_segments, created_at
                FROM campaigns WHERE status = 'active'
            """) as cursor:
                campaigns = await cursor.fetchall()
            
            if not persona_row:
                # Return limited campaigns if no persona
                return [
                    {
                        "id": campaign[0],
                        "title": campaign[1],
                        "description": campaign[2],
                        "budget": campaign[3],
                        "cpc": campaign[4],
                        "targetAudience": "General",
                        "status": "active",
                        "clicks": 0,
                        "conversions": 0,
                        "estimatedReach": 1000
                    }
                    for campaign in campaigns[:2]  # Limit to 2 campaigns
                ]
            
            # Parse persona and match campaigns
            try:
                stored_info = json.loads(persona_row[0])
                fid = stored_info.get("fid")
                if not fid:
                    raise ValueError("FID not found in persona data")
                persona_data = await storage_manager.retrieve_from_cess(fid)
            except (json.JSONDecodeError, ValueError) as e:
                 raise HTTPException(status_code=500, detail=f"Could not retrieve or parse persona data from storage: {e}")

            audience_segments = persona_data.get("audience_segments", {}).get("segments", [])
            targeting_scores = persona_data.get("targeting_scores", {})
            
            matched_campaigns = []
            for campaign in campaigns:
                target_segments = json.loads(campaign[5] or "[]")
                
                # Calculate campaign match using simple scoring
                match_score = 0.0
                for segment in target_segments:
                    if segment in audience_segments:
                        match_score += 0.4
                    # Check if segment matches any targeting score
                    for score_key, score_value in targeting_scores.items():
                        if segment.lower() in score_key or score_key in segment.lower():
                            match_score += score_value * 0.6
                
                if match_score > 0.2:  # Minimum threshold
                    # Get campaign interaction stats
                    async with db.execute("""
                        SELECT COUNT(*), SUM(CASE WHEN interaction_type = 'conversion' THEN 1 ELSE 0 END)
                        FROM campaign_interactions WHERE campaign_id = ?
                    """, (campaign[0],)) as stats_cursor:
                        stats = await stats_cursor.fetchone()
                    
                    clicks = stats[0] or 0
                    conversions = stats[1] or 0
                    
                    matched_campaigns.append({
                        "id": campaign[0],
                        "title": campaign[1],
                        "description": campaign[2],
                        "budget": campaign[3],
                        "cpc": campaign[4],
                        "targetAudience": ", ".join(target_segments),
                        "status": "active",
                        "clicks": clicks,
                        "conversions": conversions,
                        "estimatedReach": max(1000, int(match_score * 5000))
                    })
            
            # Sort by match quality and return top campaigns
            return matched_campaigns[:5]
            
    except Exception as e:
        logger.error(f"Error getting campaigns: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/campaigns/click")
async def handle_campaign_click(request: CampaignClickRequest):
    """Handle user click on campaign and distribute rewards"""
    try:
        async with aiosqlite.connect(DATABASE_URL) as db:
            # Get campaign details
            async with db.execute("""
                SELECT cpc, budget FROM campaigns WHERE id = ? AND status = 'active'
            """, (request.campaign_id,)) as cursor:
                campaign = await cursor.fetchone()
            
            if not campaign:
                raise HTTPException(status_code=404, detail="Campaign not found")
            
            cpc_amount = campaign[0]  # Cost per click in ETH
            
            # Check if user has already clicked this campaign recently (prevent spam)
            recent_cutoff = datetime.utcnow() - timedelta(hours=1)
            async with db.execute("""
                SELECT COUNT(*) FROM campaign_interactions 
                WHERE campaign_id = ? AND user_address = ? AND timestamp > ?
            """, (request.campaign_id, request.user_address, recent_cutoff.isoformat())) as cursor:
                recent_clicks = await cursor.fetchone()
            
            if recent_clicks[0] > 0:
                raise HTTPException(status_code=429, detail="Too many recent clicks on this campaign")
            
            # Record the interaction
            interaction_id = str(uuid.uuid4())
            await db.execute("""
                INSERT INTO campaign_interactions (id, campaign_id, user_address, interaction_type, reward_amount, timestamp)
                VALUES (?, ?, ?, 'click', ?, ?)
            """, (interaction_id, request.campaign_id, request.user_address, cpc_amount, datetime.utcnow().isoformat()))
            
            # Record transaction
            transaction_id = str(uuid.uuid4())
            await db.execute("""
                INSERT INTO transactions (id, user_address, type, amount, description, status, timestamp)
                VALUES (?, ?, 'campaign_click', ?, ?, 'completed', ?)
            """, (
                transaction_id, 
                request.user_address, 
                str(int(float(cpc_amount) * 10**18)),  # Convert to wei
                f"Clique na campanha: {request.campaign_id[:8]}...",
                datetime.utcnow().isoformat()
            ))
            
            # Update user stats
            user_stats = await DatabaseManager.get_user_stats(request.user_address)
            current_earnings = float(user_stats["total_earnings"]) if user_stats else 0.0
            new_earnings = current_earnings + float(cpc_amount)
            
            await DatabaseManager.update_user_stats(
                request.user_address,
                total_earnings=str(new_earnings),
                total_interactions=(user_stats["total_interactions"] if user_stats else 0) + 1,
                reputation_score=(user_stats["reputation_score"] if user_stats else 0) + 1
            )
            
            await db.commit()
            
            return {
                "success": True,
                "reward": str(int(float(cpc_amount) * 10**18)),
                "message": "Campaign interaction recorded successfully"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error handling campaign click: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/transactions/{user_address}")
async def get_transaction_history(user_address: str, limit: int = 20):
    """Get transaction history for a user"""
    try:
        async with aiosqlite.connect(DATABASE_URL) as db:
            async with db.execute("""
                SELECT id, type, amount, description, status, timestamp
                FROM transactions WHERE user_address = ?
                ORDER BY timestamp DESC LIMIT ?
            """, (user_address, limit)) as cursor:
                transactions = await cursor.fetchall()
            
            return [
                {
                    "id": tx[0],
                    "type": tx[1],
                    "amount": tx[2],
                    "description": tx[3],
                    "status": tx[4],
                    "timestamp": tx[5]
                }
                for tx in transactions
            ]
            
    except Exception as e:
        logger.error(f"Error getting transactions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/streamer/status/{user_address}")
async def get_streamer_status(user_address: str):
    """Get streamer status and stats for a user"""
    try:
        async with aiosqlite.connect(DATABASE_URL) as db:
            # Check streamer application status
            async with db.execute("""
                SELECT status, applied_at FROM streamer_applications WHERE user_address = ?
            """, (user_address,)) as cursor:
                application = await cursor.fetchone()
            
            is_streamer = application and application[0] == 'approved'
            
            result = {
                "isStreamer": is_streamer,
                "applicationStatus": application[0] if application else None,
                "appliedAt": application[1] if application else None
            }
            
            if is_streamer:
                # Get streamer stats
                async with db.execute("""
                    SELECT SUM(CAST(amount AS REAL)) FROM transactions 
                    WHERE user_address = ? AND type = 'streamer_commission' AND status = 'completed'
                """, (user_address,)) as cursor:
                    earnings_row = await cursor.fetchone()
                
                total_earnings = earnings_row[0] or 0.0
                
                # Count active promotions (simplified)
                active_promotions = 0  # Would be calculated based on actual promotion system
                
                result["stats"] = {
                    "totalEarnings": str(int(total_earnings * 10**18)),
                    "activePromotions": active_promotions,
                    "conversionRate": 5.2,  # Would be calculated from actual data
                    "followers": 150  # Would come from social media integration
                }
            
            return result
            
    except Exception as e:
        logger.error(f"Error getting streamer status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/streamer/apply")
async def apply_for_streamer(request: StreamerApplicationRequest):
    """Apply to become a streamer"""
    try:
        # Check eligibility
        if request.reputation_score < 50:
            raise HTTPException(status_code=400, detail="Insufficient reputation score")
        
        async with aiosqlite.connect(DATABASE_URL) as db:
            # Check if user has persona
            async with db.execute("""
                SELECT COUNT(*) FROM personas WHERE user_address = ?
            """, (request.user_address,)) as cursor:
                persona_count = await cursor.fetchone()
            
            if persona_count[0] == 0:
                raise HTTPException(status_code=400, detail="Active persona required")
            
            # Check transaction history
            async with db.execute("""
                SELECT COUNT(*) FROM transactions WHERE user_address = ?
            """, (request.user_address,)) as cursor:
                tx_count = await cursor.fetchone()
            
            if tx_count[0] < 5:
                raise HTTPException(status_code=400, detail="Insufficient transaction history")
            
            # Submit application
            await db.execute("""
                INSERT OR REPLACE INTO streamer_applications 
                (user_address, reputation_score, proposed_commission, status, applied_at)
                VALUES (?, ?, ?, 'pending', ?)
            """, (
                request.user_address,
                request.reputation_score,
                request.proposed_commission,
                datetime.utcnow().isoformat()
            ))
            
            await db.commit()
            
            return {
                "success": True,
                "message": "Streamer application submitted successfully"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting streamer application: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/persona/{hash}")
async def get_persona_by_hash(hash: str):
    """Get persona data by hash from CESS storage"""
    try:
        clean_hash = hash.replace("0x", "")
        
        # Get FID from local database  
        async with aiosqlite.connect(DATABASE_URL) as db:
            async with db.execute("""
                SELECT fid FROM personas WHERE hash = ?
            """, (clean_hash,)) as cursor:
                row = await cursor.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Persona not found")
        
        fid = row[0]
        
        # Check if it's a CESS FID or local data
        if fid.startswith("local_"):
            # Legacy local storage
            async with aiosqlite.connect(DATABASE_URL) as db:
                async with db.execute("""
                    SELECT data FROM personas WHERE hash = ?
                """, (clean_hash,)) as cursor:
                    persona_row = await cursor.fetchone()
                
                if persona_row:
                    return json.loads(persona_row[0])
        else:
            # Retrieve from CESS
            persona_data = await storage_manager.retrieve_from_cess(fid)
            return persona_data
        
        raise HTTPException(status_code=404, detail="Persona data not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting persona: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# --- CESS Integration Endpoints ---

@app.post("/api/upload-to-cess")
async def upload_proxy_to_cess(request: Request, file: UploadFile = File(...)):
    """
    Proxy endpoint for uploading files to CESS network
    """
    # Rate limiting
    client_ip = request.client.host
    if not check_rate_limit(client_ip):
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please wait before trying again."
        )
    
    logger.info(f"Receiving file '{file.filename}' for CESS upload")
    
    try:
        # Basic validations
        MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
        file_bytes = await file.read()
        
        if len(file_bytes) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum allowed: {MAX_FILE_SIZE / 1024 / 1024}MB"
            )
        
        if len(file_bytes) == 0:
            raise HTTPException(
                status_code=400,
                detail="Empty file not allowed"
            )
        
        # Upload to CESS using storage manager
        fid = await storage_manager._upload_to_cess(file_bytes, file.filename, file.content_type)
        
        logger.info(f"✅ File uploaded to CESS successfully! FID: {fid}")
        
        return {"fid": fid}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error uploading to CESS: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/cess/metadata/{fid}")
async def get_cess_metadata(fid: str):
    """
    Retrieve metadata from CESS by FID
    """
    try:
        metadata = await storage_manager.retrieve_from_cess(fid)
        return metadata
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving CESS metadata: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving metadata")

@app.get("/api/cess/persona/{hash}")
async def get_cess_persona(hash: str):
    """
    Retrieve persona from CESS by hash
    """
    try:
        clean_hash = hash.replace("0x", "")
        
        # Get FID from local database
        async with aiosqlite.connect(DATABASE_URL) as db:
            async with db.execute("""
                SELECT fid FROM personas WHERE hash = ?
            """, (clean_hash,)) as cursor:
                row = await cursor.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Persona not found")
        
        fid = row[0]
        
        # Retrieve from CESS
        persona_data = await storage_manager.retrieve_from_cess(fid)
        
        return persona_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving persona from CESS: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving persona")

@app.post("/api/cess/store-product-metadata")
async def store_product_metadata(metadata: Dict[str, Any]):
    """
    Store product metadata in CESS
    """
    try:
        fid = await storage_manager.store_product_metadata(metadata)
        
        return {
            "success": True,
            "fid": fid,
            "message": "Product metadata stored in CESS successfully"
        }
        
    except Exception as e:
        logger.error(f"Error storing product metadata: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cess/store-campaign")
async def store_campaign_data(campaign_data: Dict[str, Any]):
    """
    Store campaign data in CESS
    """
    try:
        fid = await storage_manager.store_campaign_data(campaign_data)
        
        return {
            "success": True,
            "fid": fid,
            "message": "Campaign data stored in CESS successfully"
        }
        
    except Exception as e:
        logger.error(f"Error storing campaign data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/cess/cache/stats")
async def cess_cache_stats():
    """
    CESS cache statistics
    """
    cess_cache_count = len([key for key in memory_cache.keys() if key.startswith("cess_metadata:")])
    
    return {
        "total_cache_entries": len(memory_cache),
        "cess_metadata_entries": cess_cache_count,
        "cache_ttl_hours": METADATA_CACHE_TTL / 3600,
        "cess_gateway": CESS_GATEWAY_URL,
        "cess_territory": CESS_TERRITORY
    }

@app.post("/api/cess/cache/invalidate/{fid}")
async def invalidate_cess_cache(fid: str):
    """
    Invalidate CESS cache for specific FID
    """
    cache_key = f"cess_metadata:{fid}"
    
    if cache_key in memory_cache:
        del memory_cache[cache_key]
        return {"status": "invalidated", "fid": fid}
    else:
        return {"status": "not_found", "fid": fid}

# --- Extension integration endpoints ---

@app.post("/api/extension/sync")
async def sync_extension_data(request: ExtensionSyncRequest):
    """Sync Browse data from browser extension"""
    try:
        # Validate user exists
        async with aiosqlite.connect(DATABASE_URL) as db:
            async with db.execute("""
                SELECT COUNT(*) FROM personas WHERE user_address = ?
            """, (request.user_address,)) as cursor:
                user_exists = (await cursor.fetchone())[0] > 0
        
        if not user_exists:
            return {
                "success": False,
                "message": "User persona not found. Create persona first."
            }
        
        # Process and update Browse data
        Browse_update = {
            "categories": request.Browse_data.get("categories", []),
            "time_spent": request.Browse_data.get("time_spent", {}),
            "devices": request.Browse_data.get("devices", ["Desktop"]),
            "last_sync": datetime.utcnow().isoformat()
        }
        
        # Update user's persona with new Browse data
        async with aiosqlite.connect(DATABASE_URL) as db:
            # Get current persona
            async with db.execute("""
                SELECT data FROM personas WHERE user_address = ?
            """, (request.user_address,)) as cursor:
                persona_row = await cursor.fetchone()
            
            if persona_row:
                persona_data = json.loads(persona_row[0])
                
                # Update Browse profile
                persona_data["Browse_profile"].update({
                    "category_preferences": request.Browse_data.get("time_spent", {}),
                    "last_extension_sync": datetime.utcnow().isoformat(),
                    "total_sync_sessions": persona_data.get("total_sync_sessions", 0) + 1
                })
                
                # Recalculate targeting scores with new data
                updated_targeting = persona_processor._calculate_targeting_scores(
                    persona_data.get("interest_profile", {}),
                    persona_data.get("Browse_profile", {}),
                    persona_data.get("preference_profile", {})
                )
                persona_data["targeting_scores"] = updated_targeting
                
                # Update in database
                await db.execute("""
                    UPDATE personas SET data = ?, updated_at = ? WHERE user_address = ?
                """, (json.dumps(persona_data), datetime.utcnow().isoformat(), request.user_address))
        
        # Reward user for data sharing
        reward_amount = "0.001"  # 0.001 ETH reward
        transaction_id = str(uuid.uuid4())
        
        async with aiosqlite.connect(DATABASE_URL) as db:
            await db.execute("""
                INSERT INTO transactions (id, user_address, type, amount, description, status, timestamp)
                VALUES (?, ?, 'data_sync_reward', ?, ?, 'completed', ?)
            """, (
                transaction_id,
                request.user_address,
                str(int(float(reward_amount) * 10**18)),
                "Recompensa por sincronização de dados da extensão",
                datetime.utcnow().isoformat()
            ))
            
            # Update user stats
            user_stats = await DatabaseManager.get_user_stats(request.user_address)
            current_earnings = float(user_stats["total_earnings"]) if user_stats else 0.0
            new_earnings = current_earnings + float(reward_amount)
            
            await DatabaseManager.update_user_stats(
                request.user_address,
                total_earnings=str(new_earnings),
                reputation_score=(user_stats["reputation_score"] if user_stats else 0) + 2
            )
            
            await db.commit()
        
        return {
            "success": True,
            "message": "Data synced successfully",
            "reward": str(int(float(reward_amount) * 10**18)),
            "updated_categories": len(request.Browse_data.get("categories", [])),
            "next_sync_in": 1800  # 30 minutes
        }
        
    except Exception as e:
        logger.error(f"Error syncing extension data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/extension/user-status/{user_address}")
async def get_extension_user_status(user_address: str):
    """Get user status for extension"""
    try:
        async with aiosqlite.connect(DATABASE_URL) as db:
            # Check if user has persona
            async with db.execute("""
                SELECT hash, fid, created_at FROM personas WHERE user_address = ?
            """, (user_address,)) as cursor:
                persona = await cursor.fetchone()
            
            # Get user stats
            user_stats = await DatabaseManager.get_user_stats(user_address)
            
            # Get recent transactions
            async with db.execute("""
                SELECT type, amount, timestamp FROM transactions 
                WHERE user_address = ? 
                ORDER BY timestamp DESC LIMIT 5
            """, (user_address,)) as cursor:
                recent_transactions = await cursor.fetchall()
        
        return {
            "success": True,
            "user_address": user_address,
            "has_persona": persona is not None,
            "persona_created": persona[2] if persona else None,
            "reputation_score": user_stats["reputation_score"] if user_stats else 0,
            "total_earnings": user_stats["total_earnings"] if user_stats else "0",
            "recent_transactions": [
                {
                    "type": tx[0],
                    "amount": tx[1],
                    "timestamp": tx[2]
                } for tx in recent_transactions
            ],
            "extension_compatible": True
        }
        
    except Exception as e:
        logger.error(f"Error getting extension user status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Admin endpoints ---

@app.post("/api/admin/campaigns")
async def create_campaign(
    title: str,
    description: str,
    budget: str,
    cpc: str,
    target_segments: List[str]
):
    """Create a new advertising campaign"""
    try:
        campaign_id = str(uuid.uuid4())
        
        async with aiosqlite.connect(DATABASE_URL) as db:
            await db.execute("""
                INSERT INTO campaigns (id, title, description, budget, cpc, target_segments, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                campaign_id,
                title,
                description,
                budget,
                cpc,
                json.dumps(target_segments),
                datetime.utcnow().isoformat()
            ))
            await db.commit()
        
        return {
            "success": True,
            "campaign_id": campaign_id,
            "message": "Campaign created successfully"
        }
        
    except Exception as e:
        logger.error(f"Error creating campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/products")
async def create_product(
    name: str,
    description: str,
    price: str,
    seller_address: str,
    category: str,
    image_url: str = "",
    target_segments: List[str] = []
):
    """Create a new product"""
    try:
        product_id = str(uuid.uuid4())
        
        async with aiosqlite.connect(DATABASE_URL) as db:
            await db.execute("""
                INSERT INTO products (id, name, description, price, seller_address, category, image_url, target_segments, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                product_id,
                name,
                description,
                price,
                seller_address,
                category,
                image_url,
                json.dumps(target_segments),
                datetime.utcnow().isoformat()
            ))
            await db.commit()
        
        return {
            "success": True,
            "product_id": product_id,
            "message": "Product created successfully"
        }
        
    except Exception as e:
        logger.error(f"Error creating product: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Analytics endpoints ---

@app.get("/api/analytics/overview")
async def get_analytics_overview():
    """Get platform analytics overview"""
    try:
        async with aiosqlite.connect(DATABASE_URL) as db:
            # Total users with personas
            async with db.execute("SELECT COUNT(DISTINCT user_address) FROM personas") as cursor:
                total_users = (await cursor.fetchone())[0]
            
            # Total campaigns
            async with db.execute("SELECT COUNT(*) FROM campaigns WHERE status = 'active'") as cursor:
                active_campaigns = (await cursor.fetchone())[0]
            
            # Total interactions
            async with db.execute("SELECT COUNT(*) FROM campaign_interactions") as cursor:
                total_interactions = (await cursor.fetchone())[0]
            
            # Total value locked (simplified)
            async with db.execute("""
                SELECT SUM(CAST(amount AS REAL)) FROM transactions 
                WHERE type != 'purchase' AND status = 'completed'
            """) as cursor:
                total_rewards = (await cursor.fetchone())[0] or 0
            
            return {
                "totalUsers": total_users,
                "activeCampaigns": active_campaigns,
                "totalInteractions": total_interactions,
                "totalRewardsDistributed": str(int(total_rewards * 10**18)),
                "platformHealth": "healthy",
                "processingMethod": "rule_based"
            }
            
    except Exception as e:
        logger.error(f"Error getting analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/init-sample-data")
async def init_sample_data():
    """Initialize sample campaigns and products for testing"""
    try:
        async with aiosqlite.connect(DATABASE_URL) as db:
            # Sample campaigns
            sample_campaigns = [
                {
                    "id": str(uuid.uuid4()),
                    "title": "Tech Gadgets 2025",
                    "description": "Novos gadgets tecnológicos para entusiastas",
                    "budget": "5.0",
                    "cpc": "0.01",
                    "target_segments": ["tech_enthusiast", "early_adopter"]
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Fashion Week Trends",
                    "description": "Últimas tendências da moda internacional",
                    "budget": "3.0",
                    "cpc": "0.008",
                    "target_segments": ["fashion_lover", "premium_consumer"]
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Fitness Revolution",
                    "description": "Equipamentos e suplementos para fitness",
                    "budget": "2.5",
                    "cpc": "0.012",
                    "target_segments": ["health_conscious", "active_lifestyle"]
                }
            ]
            
            for campaign in sample_campaigns:
                await db.execute("""
                    INSERT OR IGNORE INTO campaigns (id, title, description, budget, cpc, target_segments, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    campaign["id"],
                    campaign["title"], 
                    campaign["description"],
                    campaign["budget"],
                    campaign["cpc"],
                    json.dumps(campaign["target_segments"]),
                    datetime.utcnow().isoformat()
                ))
            
            # Sample products
            sample_products = [
                {
                    "id": str(uuid.uuid4()),
                    "name": "Smartphone XYZ Pro",
                    "description": "Último lançamento em smartphones com IA integrada",
                    "price": "0.5",
                    "seller_address": "0x742637c8c8b8D45e8c4b1F1B1c8C4B8E8c4b1F1B",
                    "category": "technology",
                    "image_url": "https://example.com/phone.jpg",
                    "target_segments": ["tech_enthusiast", "mobile_user"]
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "Tênis Esportivo Elite",
                    "description": "Tênis profissional para corrida e academia",
                    "price": "0.2",
                    "seller_address": "0x742637c8c8b8D45e8c4b1F1B1c8C4B8E8c4b1F1B",
                    "category": "sports",
                    "image_url": "https://example.com/shoes.jpg",
                    "target_segments": ["active_lifestyle", "health_conscious"]
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "Curso de Blockchain",
                    "description": "Aprenda desenvolvimento blockchain do zero",
                    "price": "0.1",
                    "seller_address": "0x742637c8c8b8D45e8c4b1F1B1c8C4B8E8c4b1F1B",
                    "category": "education",
                    "image_url": "https://example.com/course.jpg",
                    "target_segments": ["tech_enthusiast", "learner"]
                }
            ]
            
            for product in sample_products:
                await db.execute("""
                    INSERT OR IGNORE INTO products (id, name, description, price, seller_address, category, image_url, target_segments, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    product["id"],
                    product["name"],
                    product["description"],
                    product["price"],
                    product["seller_address"],
                    product["category"],
                    product["image_url"],
                    json.dumps(product["target_segments"]),
                    datetime.utcnow().isoformat()
                ))
            
            await db.commit()
            
            return {
                "success": True,
                "message": f"Sample data initialized: {len(sample_campaigns)} campaigns, {len(sample_products)} products"
            }
            
    except Exception as e:
        logger.error(f"Error initializing sample data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint with CESS status"""
    try:
        # Test database connection
        database_healthy = False
        try:
            async with aiosqlite.connect(DATABASE_URL) as db:
                await db.execute("SELECT 1")
            database_healthy = True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
        
        # Test CESS connection
        cess_healthy = False
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.head(CESS_GATEWAY_URL)
                cess_healthy = response.status_code < 500
        except Exception as e:
            logger.error(f"CESS health check failed: {e}")
        
        overall_status = "healthy" if (database_healthy and cess_healthy) else "degraded"
        
        return {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "processing_method": "rule_based",
            "services": {
                "database": "operational" if database_healthy else "error",
                "persona_processor": "operational",
                "cess_storage": "operational" if cess_healthy else "error",
                "cess_gateway": CESS_GATEWAY_URL,
                "storage_method": "cess_decentralized"
            },
            "cache_stats": {
                "memory_cache_entries": len(memory_cache),
                "cess_metadata_cached": len([k for k in memory_cache.keys() if k.startswith("cess_metadata:")])
            }
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
