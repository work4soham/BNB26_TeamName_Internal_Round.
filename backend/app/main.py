import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api.endpoints import router
from backend.app.database.session import engine, get_db_info
from backend.app.models.base import Base
import backend.app.models  # Register all models with Base.metadata

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("blackbox")

# Create tables if not present
try:
    Base.metadata.create_all(bind=engine)
    db_info = get_db_info()
    logger.info(f"Database schema verified. Active engine: {db_info['provider']}")
except Exception as e:
    logger.warning(f"Database schema initialization warning: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    info = get_db_info()
    logger.info(f"Black Box AI Flight Recorder initialized. DB: {info['provider']} (Supabase Project: {info['supabase_project_id']}).")
    yield
    logger.info("Black Box AI Flight Recorder backend shut down cleanly.")

app = FastAPI(
    title="Black Box — AI Flight Recorder",
    description="Research-grade execution trace recorder and root-cause benchmark platform for AI agents.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount endpoints on both /api/v1 and root for seamless client and benchmark compatibility
app.include_router(router, prefix="/api/v1")
app.include_router(router, prefix="")
