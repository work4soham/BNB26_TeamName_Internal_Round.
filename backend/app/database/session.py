import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from backend.app.database.supabase import (
    SUPABASE_PROJECT_ID,
    build_supabase_postgres_url
)

load_dotenv()

logger = logging.getLogger("blackbox.database")

def resolve_database_url() -> str:
    """
    Resolves the primary database URL.
    Prioritizes explicit DATABASE_URL (normalizing postgres:// to postgresql://),
    then checks for Supabase project credentials, and falls back to SQLite.
    """
    raw_url = os.getenv("DATABASE_URL", "").strip()

    # Normalization for Heroku/Render/Supabase postgres:// format
    if raw_url.startswith("postgres://"):
        raw_url = "postgresql://" + raw_url[len("postgres://"):]

    if raw_url:
        return raw_url

    # Check if Supabase PostgreSQL URL can be built from project credentials
    supabase_pg_url = build_supabase_postgres_url()
    if supabase_pg_url:
        logger.info(f"Built Supabase PostgreSQL connection for project {SUPABASE_PROJECT_ID}")
        return supabase_pg_url

    # Default local SQLite database
    return "sqlite:///./blackbox.db"

DATABASE_URL = resolve_database_url()

def create_database_engine(url: str):
    """Creates SQLAlchemy engine with production-ready connection pooling."""
    engine_kwargs = {}
    if url.startswith("sqlite"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}
    elif url.startswith("postgresql"):
        # Supabase and pooled PostgreSQL optimization
        engine_kwargs["pool_pre_ping"] = True
        engine_kwargs["pool_recycle"] = 300
        engine_kwargs["pool_size"] = 10
        engine_kwargs["max_overflow"] = 20

    try:
        eng = create_engine(url, **engine_kwargs)
        # Verify connection test for non-sqlite
        if not url.startswith("sqlite"):
            with eng.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Successfully connected to PostgreSQL / Supabase database.")
        return eng, url
    except Exception as e:
        if not url.startswith("sqlite"):
            logger.warning(
                f"PostgreSQL connection to {url.split('@')[-1] if '@' in url else url} "
                f"failed ({e}). Falling back to local SQLite database."
            )
            fallback_url = "sqlite:///./blackbox.db"
            eng = create_engine(fallback_url, connect_args={"check_same_thread": False})
            return eng, fallback_url
        raise

engine, ACTIVE_DATABASE_URL = create_database_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_db_info():
    is_supabase = (
        SUPABASE_PROJECT_ID in ACTIVE_DATABASE_URL 
        or "supabase.co" in ACTIVE_DATABASE_URL 
        or "pooler.supabase.com" in ACTIVE_DATABASE_URL
    )
    is_postgres = ACTIVE_DATABASE_URL.startswith("postgresql")
    
    return {
        "active_url_masked": ACTIVE_DATABASE_URL.split("@")[-1] if "@" in ACTIVE_DATABASE_URL else ACTIVE_DATABASE_URL,
        "dialect": "postgresql" if is_postgres else "sqlite",
        "is_supabase": is_supabase,
        "supabase_project_id": SUPABASE_PROJECT_ID,
        "provider": "Supabase PostgreSQL" if is_supabase else ("PostgreSQL" if is_postgres else "SQLite")
    }
