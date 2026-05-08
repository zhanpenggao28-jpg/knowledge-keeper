import os
import tempfile
import subprocess


def transcribe(video_path: str) -> str:
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        return ''

    audio_path = _extract_audio(video_path)
    if not audio_path:
        return ''

    try:
        model = WhisperModel("base", device="cpu", compute_type="int8")
        segments, _ = model.transcribe(audio_path, language="zh")
        text = " ".join(s.text for s in segments)
        return text
    except Exception:
        return ''
    finally:
        if audio_path and os.path.exists(audio_path):
            os.remove(audio_path)


def _extract_audio(video_path: str) -> str | None:
    try:
        tmp = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
        tmp.close()
        result = subprocess.run(
            ['ffmpeg', '-i', video_path, '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', tmp.name, '-y'],
            capture_output=True, timeout=300
        )
        if result.returncode == 0:
            return tmp.name
        else:
            os.remove(tmp.name)
            return None
    except Exception:
        return None
