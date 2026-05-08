import os

MIME_MAP = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.mp4': 'video/mp4',
    '.mkv': 'video/x-matroska',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
}


def get_mime_type(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    return MIME_MAP.get(ext, 'application/octet-stream')


def categorize(ext: str) -> str:
    ext = ext.lower().lstrip('.')
    doc_types = {'pdf', 'docx', 'doc', 'txt', 'pptx', 'ppt', 'md'}
    image_types = {'jpg', 'jpeg', 'png', 'gif', 'bmp'}
    video_types = {'mp4', 'mkv', 'avi', 'mov', 'webm'}
    if ext in doc_types:
        return 'document'
    if ext in image_types:
        return 'image'
    if ext in video_types:
        return 'video'
    return 'other'
