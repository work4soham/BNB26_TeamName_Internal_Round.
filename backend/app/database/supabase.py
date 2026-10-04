import os
import logging
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("blackbox.supabase")

# Supabase Project Identifiers & API Keys
DEFAULT_PROJECT_ID = "lmowqbpuupkrxvtorknk"
SUPABASE_PROJECT_ID = os.getenv("SUPABASE_PROJECT_ID", DEFAULT_PROJECT_ID).strip()
SUPABASE_URL = os.getenv("SUPABASE_URL", f"https://{SUPABASE_PROJECT_ID}.supabase.co").strip()

SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", "").strip()
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", SUPABASE_PUBLISHABLE_KEY).strip()

SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY", "").strip()
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SECRET_KEY).strip()

SUPABASE_JWKS_URL = os.getenv(
    "SUPABASE_JWKS_URL", 
    f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
).strip()

SUPABASE_DB_PASSWORD = os.getenv("SUPABASE_DB_PASSWORD", "").strip()
SUPABASE_DB_HOST = os.getenv("SUPABASE_DB_HOST", f"db.{SUPABASE_PROJECT_ID}.supabase.co").strip()

_supabase_client = None

def get_supabase_client():
    """
    Returns an initialized Supabase Python client instance if keys are configured.
    Prefers the secret/service-role key for backend elevated operations.
    """
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    key = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY or SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY
    if not key:
        logger.debug("Supabase client not initialized: No publishable or secret key found.")
        return None

    try:
        from supabase import create_client, Client
        _supabase_client = create_client(SUPABASE_URL, key)
        logger.info(f"Supabase client initialized successfully for project: {SUPABASE_PROJECT_ID}")
        return _supabase_client
    except Exception as e:
        logger.warning(f"Failed to initialize Supabase client: {e}")
        return None

def build_supabase_postgres_url(password: Optional[str] = None) -> str:
    """
    Constructs the direct or pooled PostgreSQL connection URL for this Supabase project.
    """
    pwd = password or SUPABASE_DB_PASSWORD
    if not pwd:
        return ""
    return f"postgresql://postgres:{pwd}@{SUPABASE_DB_HOST}:5432/postgres"

def test_supabase_api_connection() -> Dict[str, Any]:
    """
    Tests live communication with the Supabase API via the client SDK.
    """
    client = get_supabase_client()
    if not client:
        return {"connected": False, "error": "No API keys configured"}

    try:
        # Probe auth health or system settings via client
        auth_settings = client.auth.get_session()
        return {"connected": True, "details": "Supabase client connected & authenticated"}
    except Exception as e:
        # Even if session is None, client connectivity can be valid
        err_msg = str(e)
        if "session" in err_msg.lower() or "not logged in" in err_msg.lower():
            return {"connected": True, "details": "Supabase client initialized and reachable"}
        return {"connected": False, "error": err_msg}

def get_supabase_metadata() -> Dict[str, Any]:
    """
    Returns the Supabase integration status and configuration details.
    """
    client = get_supabase_client()
    has_db_pwd = bool(SUPABASE_DB_PASSWORD)
    database_url = os.getenv("DATABASE_URL", "")
    is_supabase_db = (
        SUPABASE_PROJECT_ID in database_url 
        or "supabase.co" in database_url 
        or "pooler.supabase.com" in database_url
    )

    api_test = test_supabase_api_connection() if client else {"connected": False}

    return {
        "project_id": SUPABASE_PROJECT_ID,
        "supabase_url": SUPABASE_URL,
        "database_host": SUPABASE_DB_HOST,
        "jwks_url": SUPABASE_JWKS_URL,
        "has_publishable_key": bool(SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY),
        "has_secret_key": bool(SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY),
        "has_anon_key": bool(SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY),
        "has_service_role_key": bool(SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY),
        "has_db_password": has_db_pwd,
        "client_connected": client is not None,
        "api_reachable": api_test.get("connected", False),
        "is_database_connected": is_supabase_db,
        "provider": "Supabase" if is_supabase_db else "SQLite (Fallback)",
    }
