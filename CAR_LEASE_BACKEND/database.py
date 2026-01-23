import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

load_dotenv()

# PostgreSQL connection URL
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL environment variable not set. "
        "Please configure it in .env file or as a system environment variable."
    )

# Create engine and session factory
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """Create contracts table if not exists"""
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS contracts (
                id SERIAL PRIMARY KEY,
                filename TEXT NOT NULL,
                raw_text TEXT,
                sla_data JSONB,
                vehicle_data JSONB,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            ALTER TABLE contracts
            ADD COLUMN IF NOT EXISTS sla_data JSONB
        """))
        conn.execute(text("""
            ALTER TABLE contracts
            ADD COLUMN IF NOT EXISTS vehicle_data JSONB
        """))
    print("✓ Database initialized: contracts table ready")

def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
