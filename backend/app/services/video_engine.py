import os
import uuid
import subprocess
from pathlib import Path
from typing import Optional, Tuple

# For Vercel, we'll use ffmpeg-python for video processing
# MoviePy may have issues in serverless environments

class VideoEngine:
    """Core video processing engine using FFmpeg"""
    
    @staticmethod
    def get_video_info(input_path: str) -> dict:
        """Get video information using ffprobe"""
        cmd = [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            input_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"Failed to get video info: {result.stderr}")
        
        import json
        data = json.loads(result.stdout)
        
        # Extract relevant info
        video_stream = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), None)
        audio_stream = next((s for s in data.get("streams", []) if s.get("codec_type") == "audio"), None)
        
        return {
            "duration": float(data.get("format", {}).get("duration", 0)),
            "width": int(video_stream.get("width", 0)) if video_stream else 0,
            "height": int(video_stream.get("height", 0)) if video_stream else 0,
            "fps": VideoEngine._parse_fps(video_stream.get("r_frame_rate", "0/1")) if video_stream else 0,
            "has_audio": audio_stream is not None,
            "format": data.get("format", {}).get("format_name", "unknown"),
            "size": int(data.get("format", {}).get("size", 0)),
        }
    
    @staticmethod
    def _parse_fps(fps_string: str) -> float:
        """Parse FPS from fraction string like '30/1'"""
        try:
            num, denom = fps_string.split("/")
            return float(num) / float(denom)
        except:
            return 0.0
    
    @staticmethod
    def trim_video(
        input_path: str,
        output_path: str,
        start_time: float,
        end_time: float,
        include_audio: bool = True
    ) -> dict:
        """Trim video from start_time to end_time"""
        cmd = [
            "ffmpeg",
            "-y",  # Overwrite output
            "-i", input_path,
            "-ss", str(start_time),
            "-to", str(end_time),
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
        ]
        
        if include_audio:
            cmd.extend(["-c:a", "aac", "-b:a", "128k"])
        else:
            cmd.extend(["-an"])
        
        cmd.append(output_path)
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"Failed to trim video: {result.stderr}")
        
        return {
            "status": "success",
            "output_path": output_path,
            "duration": end_time - start_time
        }
    
    @staticmethod
    def apply_filter(
        input_path: str,
        output_path: str,
        filter_type: str,
        filter_params: dict
    ) -> dict:
        """Apply video filter (brightness, contrast, saturation, etc.)"""
        cmd = [
            "ffmpeg",
            "-y",
            "-i", input_path,
        ]
        
        # Build filter string based on filter type
        if filter_type == "brightness":
            brightness = filter_params.get("value", 0)
            vf = f"eq=brightness={brightness}"
        elif filter_type == "contrast":
            contrast = filter_params.get("value", 1)
            vf = f"eq=contrast={contrast}"
        elif filter_type == "saturation":
            saturation = filter_params.get("value", 1)
            vf = f"eq=saturation={saturation}"
        elif filter_type == "grayscale":
            vf = "hue=s=0"
        elif filter_type == "sepia":
            vf = "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131"
        elif filter_type == "blur":
            radius = filter_params.get("radius", 5)
            vf = f"boxblur={radius}:{radius}"
        else:
            raise ValueError(f"Unknown filter type: {filter_type}")
        
        cmd.extend(["-vf", vf, "-c:a", "copy", output_path])
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"Failed to apply filter: {result.stderr}")
        
        return {
            "status": "success",
            "output_path": output_path,
            "filter": filter_type
        }
    
    @staticmethod
    def generate_thumbnail(
        input_path: str,
        output_path: str,
        timestamp: float = 0
    ) -> dict:
        """Generate thumbnail at specified timestamp"""
        cmd = [
            "ffmpeg",
            "-y",
            "-i", input_path,
            "-ss", str(timestamp),
            "-vframes", "1",
            "-q:v", "2",
            output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"Failed to generate thumbnail: {result.stderr}")
        
        return {
            "status": "success",
            "output_path": output_path
        }
    
    @staticmethod
    def get_frame_at_time(input_path: str, time: float) -> Optional[bytes]:
        """Extract a single frame as bytes at specified time"""
        cmd = [
            "ffmpeg",
            "-y",
            "-ss", str(time),
            "-i", input_path,
            "-vframes", "1",
            "-f", "image2pipe",
            "-vcodec", "png",
            "-"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            return None
        
        return result.stdout.encode('latin-1') if isinstance(result.stdout, str) else result.stdout


# Singleton instance
video_engine = VideoEngine()
