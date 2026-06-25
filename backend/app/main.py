from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from .config import UPLOADS_DIR, OUTPUTS_DIR, CORS_ORIGINS, VERCEL_ENV
from .routes import video

# Create FastAPI app
app = FastAPI(
    title="amkyawdev-edits API",
    description="Video editing backend API",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files (for local development)
if os.path.exists(UPLOADS_DIR):
    app.mount("/api/video/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
if os.path.exists(OUTPUTS_DIR):
    app.mount("/api/video/outputs", StaticFiles(directory=OUTPUTS_DIR), name="outputs")

# Include routers
app.include_router(video.router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "amkyawdev-edits API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "environment": VERCEL_ENV
    }


@app.get("/api")
async def api_info():
    """API information"""
    return {
        "endpoints": {
            "upload": "POST /api/video/upload",
            "trim": "POST /api/video/trim",
            "filter": "POST /api/video/filter",
            "thumbnail": "POST /api/video/thumbnail",
            "info": "GET /api/video/info",
            "cleanup": "DELETE /api/video/cleanup"
        }
    }
