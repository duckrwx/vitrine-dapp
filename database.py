# database.py
from sqlalchemy import create_engine, Column, String, DateTime
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import datetime

# Define o nome do ficheiro do nosso banco de dados
DATABASE_URL = "sqlite:///./vitrine.db"

# Cria o "motor" de conexão com o banco de dados
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

# Cria uma sessão para conversar com o banco de dados
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para os nossos modelos de tabela
Base = declarative_base()

# --- Definição da nossa Tabela de Personas ---
class Persona(Base):
    __tablename__ = "personas"

    # Colunas da tabela
    user_address = Column(String, primary_key=True, index=True)
    cess_fid = Column(String, nullable=True) # Pode ser nulo no início
    on_chain_hash = Column(String, nullable=True) # Pode ser nulo no início
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)
    connection_id = Column(String, unique=True, index=True, nullable=True)
    
    # Novas colunas para guardar os dados brutos como strings JSON
    declared_interests = Column(String, nullable=True)
    purchase_intent = Column(String, nullable=True)
    age_range = Column(String, nullable=True)
    favorite_brands = Column(String, nullable=True)
    extension_interests = Column(String, nullable=True)

# Função para criar a tabela na base de dados se ela não existir
def create_db_and_tables():
    Base.metadata.create_all(bind=engine)
