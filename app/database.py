from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql://postgres:root@localhost:5432/car_contract_ai"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
