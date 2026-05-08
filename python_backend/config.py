import os

DATA_DIR = os.environ.get(
    'KK_DATA_DIR',
    os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
)
DB_PATH = os.path.join(DATA_DIR, 'knowledge.db')
FILES_DIR = os.environ.get(
    'KK_FILES_DIR',
    os.path.join(DATA_DIR, 'files')
)

OLLAMA_BASE_URL = os.environ.get('OLLAMA_BASE_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.environ.get('OLLAMA_MODEL', 'qwen2.5:7b')
WHISPER_MODEL = os.environ.get('WHISPER_MODEL', 'base')
OCR_ENGINE = os.environ.get('OCR_ENGINE', 'paddleocr')
LANGUAGE = os.environ.get('LANGUAGE', 'zh-CN')
