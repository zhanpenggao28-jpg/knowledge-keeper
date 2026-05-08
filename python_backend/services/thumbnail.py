import os
import subprocess
import tempfile
import config


def generate_thumbnail(file_path: str, file_type: str, category: str) -> str | None:
    """Generate thumbnail, returns relative path to thumbnail or None."""
    if category == 'image':
        return _thumbnail_image(file_path)
    elif category == 'video':
        return _thumbnail_video(file_path)
    elif file_type == 'pdf':
        return _thumbnail_pdf(file_path)
    return None


def generate_preview(file_path: str, file_type: str, category: str) -> str | None:
    """Generate preview-sized image, returns relative path or None.
    Previews are max 1920px on the long side, for detail panel display."""
    if category == 'image':
        return _preview_image(file_path)
    elif category == 'video':
        return _preview_video(file_path)
    elif file_type == 'pdf':
        return _preview_pdf(file_path)
    return None


def _thumbnail_image(image_path: str) -> str | None:
    try:
        from PIL import Image
        img = Image.open(image_path)
        img.thumbnail((240, 240), Image.LANCZOS)
        thumb_path = image_path + '.thumb.webp'
        img.save(thumb_path, 'WEBP', quality=75)
        # Return relative path
        rel = os.path.relpath(thumb_path, config.FILES_DIR).replace('\\', '/')
        return rel
    except Exception:
        return None


def _thumbnail_video(video_path: str) -> str | None:
    thumb_path = video_path + '.thumb.webp'

    # Try OpenCV first
    try:
        import cv2
        cap = cv2.VideoCapture(video_path)
        if cap.isOpened():
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            # Seek to 10% position or 2 seconds, whichever is later
            target_sec = max(2.0, (total_frames / fps) * 0.1) if fps > 0 else 2.0
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(target_sec * fps))
            ret, frame = cap.read()
            cap.release()
            if ret:
                from PIL import Image
                img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                img.thumbnail((320, 240), Image.LANCZOS)
                img.save(thumb_path, 'WEBP', quality=75)
                rel = os.path.relpath(thumb_path, config.FILES_DIR).replace('\\', '/')
                return rel
    except Exception:
        pass

    # Fallback to ffmpeg
    try:
        result = subprocess.run([
            'ffmpeg', '-ss', '00:00:02', '-i', video_path,
            '-vframes', '1', '-vf', 'scale=320:-1',
            thumb_path, '-y'
        ], capture_output=True, timeout=30)
        if result.returncode == 0 and os.path.exists(thumb_path):
            rel = os.path.relpath(thumb_path, config.FILES_DIR).replace('\\', '/')
            return rel
    except Exception:
        pass

    return None


def _thumbnail_pdf(pdf_path: str) -> str | None:
    try:
        import pypdfium2 as pdfium
        pdf = pdfium.PdfDocument(pdf_path)
        page = pdf[0]
        bitmap = page.render(scale=1.5)
        thumb_path = pdf_path + '.thumb.webp'
        from PIL import Image
        img = bitmap.to_pil()
        img.thumbnail((240, 320), Image.LANCZOS)
        img.save(thumb_path, 'WEBP', quality=75)
        rel = os.path.relpath(thumb_path, config.FILES_DIR).replace('\\', '/')
        return rel
    except ImportError:
        return None
    except Exception:
        return None


def _preview_image(image_path: str) -> str | None:
    try:
        from PIL import Image
        img = Image.open(image_path)
        img.thumbnail((1920, 1920), Image.LANCZOS)
        preview_path = image_path + '.preview.webp'
        img.save(preview_path, 'WEBP', quality=80)
        rel = os.path.relpath(preview_path, config.FILES_DIR).replace('\\', '/')
        return rel
    except Exception:
        return None


def _preview_video(video_path: str) -> str | None:
    preview_path = video_path + '.preview.webp'
    try:
        import cv2
        cap = cv2.VideoCapture(video_path)
        if cap.isOpened():
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            target_sec = max(2.0, (total_frames / fps) * 0.1) if fps > 0 else 2.0
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(target_sec * fps))
            ret, frame = cap.read()
            cap.release()
            if ret:
                from PIL import Image
                img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                img.thumbnail((1280, 1280), Image.LANCZOS)
                img.save(preview_path, 'WEBP', quality=80)
                rel = os.path.relpath(preview_path, config.FILES_DIR).replace('\\', '/')
                return rel
    except Exception:
        pass
    return None


def _preview_pdf(pdf_path: str) -> str | None:
    try:
        import pypdfium2 as pdfium
        pdf = pdfium.PdfDocument(pdf_path)
        page = pdf[0]
        bitmap = page.render(scale=4)
        preview_path = pdf_path + '.preview.webp'
        from PIL import Image
        img = bitmap.to_pil()
        img.thumbnail((1920, 1920), Image.LANCZOS)
        img.save(preview_path, 'WEBP', quality=80)
        rel = os.path.relpath(preview_path, config.FILES_DIR).replace('\\', '/')
        return rel
    except ImportError:
        return None
    except Exception:
        return None
