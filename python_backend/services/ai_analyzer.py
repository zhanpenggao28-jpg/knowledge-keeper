import json

try:
    import ollama
    HAS_OLLAMA = True
except ImportError:
    HAS_OLLAMA = False


def is_ollama_available(base_url: str = "http://localhost:11434") -> bool:
    if not HAS_OLLAMA:
        return False
    try:
        client = ollama.Client(host=base_url)
        client.list()
        return True
    except Exception:
        return False


def generate_tags(text: str, base_url: str = "http://localhost:11434", model: str = "qwen2.5:7b") -> list[str]:
    if not text.strip():
        return []

    try:
        client = ollama.Client(host=base_url)
        prompt = f"""请从以下文本中提取 3-5 个关键词或标签，用中文返回，每个标签不超过5个字。
只返回标签，用逗号分隔，不要返回其他内容。

文本内容：
{text[:2000]}
"""
        response = client.chat(model=model, messages=[{"role": "user", "content": prompt}])
        content = response['message']['content'].strip()
        tags = [t.strip() for t in content.replace('，', ',').split(',') if t.strip()]
        return tags[:5]
    except Exception:
        return []


def generate_summary(text: str, base_url: str = "http://localhost:11434", model: str = "qwen2.5:7b") -> str:
    if not text.strip():
        return ""

    try:
        client = ollama.Client(host=base_url)
        prompt = f"""请用 2-3 句话总结以下文本的主要内容，使用中文。

文本内容：
{text[:3000]}
"""
        response = client.chat(model=model, messages=[{"role": "user", "content": prompt}])
        return response['message']['content'].strip()
    except Exception:
        return ""
