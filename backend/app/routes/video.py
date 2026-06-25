import os
import uuid
import aiofiles
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse
from typing import Optional

from ..config import UPLOADS_DIR, OUTPUTS_DIR, MAX_FILE_SIZE
from ..services.video_engine import video_engine

router = APIRouter(prefix="/video", tags=["video"])


@router.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    """Upload a video file"""
    # Validate file type
    allowed_types = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
        )
    
    # Generate unique filename
    ext = os.path.splitext(file.filename)[1] or ".mp4"
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = UPLOADS_DIR / unique_filename
    
    # Save file
    try:
        async with aiofiles.open(file_path, "wb") as out_file:
            content = await file.read()
            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(status_code=400, detail="File too large")
            await out_file.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Get video info
    try:
        info = video_engine.get_video_info(str(file_path))
        info["filename"] = unique_filename
        info["upload_url"] = f"/api/video/file/{unique_filename}"
        return info
    except Exception as e:
        # Clean up file if info retrieval fails
        os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to process video: {str(e)}")


@router.get("/file/{filename}")
async def get_video_file(filename: str):
    """Get a video file by filename"""
    file_path = UPLOADS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, media_type="video/mp4")


@router.get("/info")
async def get_video_info(filename: str = Query(...)):
    """Get video information"""
    file_path = UPLOADS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        info = video_engine.get_video_info(str(file_path))
        return info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trim")
async def trim_video(
    filename: str = Query(...),
    start_time: float = Query(...),
    end_time: float = Query(...),
    include_audio: bool = Query(True)
):
    """Trim video from start_time to end_time"""
    input_path = UPLOADS_DIR / filename
    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Source file not found")
    
    if start_time >= end_time:
        raise HTTPException(status_code=400, detail="start_time must be less than end_time")
    
    # Generate output filename
    output_filename = f"trimmed_{uuid.uuid4()}.mp4"
    output_path = OUTPUTS_DIR / output_filename
    
    try:
        result = video_engine.trim_video(
            str(input_path),
            str(output_path),
            start_time,
            end_time,
            include_audio
        )
        return {
            **result,
            "output_url": f"/api/video/output/{output_filename}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/filter")
async def apply_filter(
    filename: str = Query(...),
    filter_type: str = Query(...),
    value: Optional[float] = Query(None)
):
    """Apply a filter to the video"""
    input_path = UPLOADS_DIR / filename
    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Source file not found")
    
    allowed_filters = ["brightness", "contrast", "saturation", "grayscale", "sepia", "blur"]
    if filter_type not in allowed_filters:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid filter type. Allowed: {', '.join(allowed_filters)}"
        )
    
    # Generate output filename
    output_filename = f"filtered_{filter_type}_{uuid.uuid4()}.mp4"
    output_path = OUTPUTS_DIR / output_filename
    
    filter_params = {}
    if value is not None:
        filter_params["value"] = value
    if filter_type == "blur":
        filter_params["radius"] = int(value) if value else 5
    
    try:
        result = video_engine.apply_filter(
            str(input_path),
            str(output_path),
            filter_type,
            filter_params
        )
        return {
            **result,
            "output_url": f"/api/video/output/{output_filename}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/output/{filename}")
async def get_output_file(filename: str):
    """Get an output video file by filename"""
    file_path = OUTPUTS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, media_type="video/mp4")


@router.post("/thumbnail")
async def generate_thumbnail(
    filename: str = Query(...),
    timestamp: float = Query(0)
):
    """Generate a thumbnail from the video"""
    input_path = UPLOADS_DIR / filename
    if not input_path.exists():
        raise HTTPException(status_code=404, detail="Source file not found")
    
    output_filename = f"thumb_{uuid.uuid4()}.jpg"
    output_path = OUTPUTS_DIR / output_filename
    
    try:
        result = video_engine.generate_thumbnail(str(input_path), str(output_path), timestamp)
        return {
            **result,
            "thumbnail_url": f"/api/video/thumbnail/{output_filename}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/thumbnail/{filename}")
async def get_thumbnail(filename: str):
    """Get a thumbnail image"""
    file_path = OUTPUTS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    return FileResponse(file_path, media_type="image/jpeg")


@router.delete("/cleanup")
async def cleanup_files(filenames: str = Query(...)):
    """Delete specified files (comma-separated)"""
    deleted = []
    errors = []
    
    for filename in filenames.split(","):
        filename = filename.strip()
        if not filename:
            continue
        
        # Check uploads
        file_path = UPLOADS_DIR / filename
        if file_path.exists():
            try:
                os.remove(file_path)
                deleted.append(filename)
            except Exception as e:
                errors.append(f"{filename}: {str(e)}")
                continue
        
        # Check outputs
        file_path = OUTPUTS_DIR / filename
        if file_path.exists():
            try:
                os.remove(file_path)
                deleted.append(filename)
            except Exception as e:
                errors.append(f"{filename}: {str(e)}")
    
    return {
        "deleted": deleted,
        "errors": errors if errors else None
    }
