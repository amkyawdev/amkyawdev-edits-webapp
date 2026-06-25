# amkyawdev-edits Backend

FastAPI-based video editing backend for processing and manipulating video files.

## Features

- Video upload and storage
- Video trimming (cut segments)
- Video filters (brightness, contrast, saturation, grayscale, sepia, blur)
- Thumbnail generation
- Video metadata extraction

## Local Development

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/video/upload` | Upload a video file |
| GET | `/api/video/info` | Get video metadata |
| POST | `/api/video/trim` | Trim video segment |
| POST | `/api/video/filter` | Apply filter to video |
| POST | `/api/video/thumbnail` | Generate thumbnail |
| DELETE | `/api/video/cleanup` | Delete uploaded files |

## Vercel Deployment

This backend is designed for Vercel Serverless deployment.

### Limitations

- File storage is ephemeral (files are deleted after function execution)
- For production, consider using S3 or similar for file storage
- FFmpeg binary needs to be available in the deployment environment

### Deploy

```bash
vercel --prod
```
