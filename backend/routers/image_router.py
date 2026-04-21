from fastapi import APIRouter, UploadFile, File, Depends
from fastapi.responses import FileResponse
from auth import get_current_user
import models, os, uuid, io

try:
    from PIL import Image, ImageEnhance, ImageFilter
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

router = APIRouter(prefix="/image", tags=["image"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/optimize")
async def optimize_image(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user)
):
    content = await file.read()
    filename = f"{uuid.uuid4()}.jpg"
    output_path = os.path.join(UPLOAD_DIR, filename)

    if PIL_AVAILABLE:
        img = Image.open(io.BytesIO(content)).convert("RGBA")
        # Auto-enhance brightness and contrast
        rgb = img.convert("RGB")
        rgb = ImageEnhance.Brightness(rgb).enhance(1.1)
        rgb = ImageEnhance.Contrast(rgb).enhance(1.15)
        rgb = ImageEnhance.Sharpness(rgb).enhance(1.2)
        # Center crop to square
        w, h = rgb.size
        s = min(w, h)
        left = (w - s) // 2
        top = (h - s) // 2
        rgb = rgb.crop((left, top, left + s, top + s))
        rgb = rgb.resize((800, 800), Image.LANCZOS)
        rgb.save(output_path, "JPEG", quality=90)
    else:
        with open(output_path, "wb") as f:
            f.write(content)

    return {
        "message": "Image optimized successfully",
        "url": f"/image/file/{filename}",
        "filename": filename
    }


@router.get("/file/{filename}")
async def serve_image(filename: str):
    path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(path):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(path)
