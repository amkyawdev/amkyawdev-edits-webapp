import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Storage paths (for local development)
STORAGE_DIR = BASE_DIR / "storage"
UPLOADS_DIR = STORAGE_DIR / "uploads"
OUTPUTS_DIR = STORAGE_DIR / "outputs"

# Ensure directories exist
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

# Vercel environment
VERCEL_ENV = os.getenv("VERCEL_ENV", "development")
VERCEL_REGION = os.getenv("VERCEL_REGION", None)

# API Settings
API_PREFIX = "/api"
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB max file size

# CORS Origins
CORS_ORIGINS = [
    "http://localhost:3000",
    "https://amkyawdev-edits-webapp.vercel.app",
    "https://amkyawdev-edits-*.vercel.app",  # Preview deployments
    "*",  # Allow all origins for development
]
