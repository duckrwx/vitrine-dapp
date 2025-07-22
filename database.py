# database.py
from sqlalchemy import create_engine, Column, String, Integer, DateTime
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import datetime

# Define o nome do arquivo do nosso banco de dados
DATABASE_URL = "sqlite:///./vitrine.db"

# Cria o "motor" de conexão com o banco de dados
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

# Cria uma sessão para conversar com o banco de dados
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para nossos modelos de tabela
Base = declarative_base()

# --- Definição da nossa Tabela de Personas ---
class Persona(Base):
    __tablename__ = "personas"

    # Colunas da tabela
    user_address = Column(String, primary_key=True, index=True)
    cess_fid = Column(String, nullable=False)
    on_chain_hash = Column(String, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

# Função para criar a tabela no banco de dados se ela não existir
def create_db_and_tables():
    Base.metadata.create_all(bind=engine)
