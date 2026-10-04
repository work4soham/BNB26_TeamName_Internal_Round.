#!/usr/bin/env python3
"""
Supabase Integration & Database Migration Script for Black Box
Project ID: lmowqbpuupkrxvtorknk
"""

import os
import sys
import argparse
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.models.base import Base
from backend.app.models.run import Run
from backend.app.models.step import Step
from backend.app.models.checkpoint import Checkpoint
from backend.app.database.supabase import (
    SUPABASE_PROJECT_ID,
    SUPABASE_URL,
    SUPABASE_DB_HOST,
    build_supabase_postgres_url
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("supabase_sync")

def verify_and_migrate(target_url: str, copy_from_sqlite: bool = False):
    logger.info(f"Target Database: {target_url.split('@')[-1] if '@' in target_url else target_url}")
    logger.info(f"Supabase Project ID: {SUPABASE_PROJECT_ID}")
    logger.info(f"Supabase Project URL: {SUPABASE_URL}")

    engine = create_engine(target_url, pool_pre_ping=True)

    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();")).scalar()
            logger.info(f"Connected successfully: {result}")
    except Exception as e:
        logger.error(f"Failed to connect to target database: {e}")
        return False

    # Create tables
    logger.info("Creating tables (runs, steps, checkpoints) in Supabase...")
    Base.metadata.create_all(bind=engine)
    logger.info("Tables created or already exist.")

    if copy_from_sqlite and os.path.exists("blackbox.db"):
        logger.info("Migrating traces from local blackbox.db to Supabase...")
        sqlite_engine = create_engine("sqlite:///./blackbox.db")
        SqliteSession = sessionmaker(bind=sqlite_engine)
        TargetSession = sessionmaker(bind=engine)

        with SqliteSession() as src, TargetSession() as dest:
            runs = src.query(Run).all()
            logger.info(f"Found {len(runs)} runs in SQLite.")
            for r in runs:
                existing = dest.query(Run).filter(Run.run_id == r.run_id).first()
                if not existing:
                    # Detach and re-add
                    src.expunge(r)
                    dest.merge(r)
            dest.commit()
            logger.info("Migration of runs and child records completed.")

    return True

def main():
    load_dotenv()
    parser = argparse.ArgumentParser(description="Initialize and verify Supabase PostgreSQL connection")
    parser.add_argument("--password", type=str, help="Supabase database password")
    parser.add_argument("--url", type=str, help="Full Supabase PostgreSQL URL")
    parser.add_argument("--migrate-sqlite", action="store_true", help="Copy existing SQLite runs to Supabase")

    args = parser.parse_args()

    db_url = args.url or os.getenv("DATABASE_URL")
    if not db_url and (args.password or os.getenv("SUPABASE_DB_PASSWORD")):
        db_url = build_supabase_postgres_url(args.password)

    if not db_url or db_url.startswith("sqlite"):
        logger.warning(
            f"No remote Supabase database connection string provided.\n"
            f"To connect to project '{SUPABASE_PROJECT_ID}', specify either:\n"
            f"  1. --password [YOUR-SUPABASE-DB-PASSWORD]\n"
            f"  2. --url postgresql://postgres:[PASSWORD]@{SUPABASE_DB_HOST}:5432/postgres\n"
            f"  3. Set SUPABASE_DB_PASSWORD in your .env file."
        )
        return

    success = verify_and_migrate(db_url, copy_from_sqlite=args.migrate_sqlite)
    if success:
        logger.info("Supabase setup verification complete.")

if __name__ == "__main__":
    main()
