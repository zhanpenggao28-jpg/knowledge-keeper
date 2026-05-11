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
        client = ollama.Client(host=base_url, proxy=None, trust_env=False)
        client.list()
        return True
    except Exception:
        return False


def generate_tags(text: str, base_url: str = "http://localhost:11434", model: str = "qwen2.5:7b") -> list[str]:
    if not text.strip():
        return []

    try:
        client = ollama.Client(host=base_url, proxy=None, trust_env=False)
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
        client = ollama.Client(host=base_url, proxy=None, trust_env=False)
        prompt = f"""请用 2-3 句话总结以下文本的主要内容，使用中文。

文本内容：
{text[:3000]}
"""
        response = client.chat(model=model, messages=[{"role": "user", "content": prompt}])
        return response['message']['content'].strip()
    except Exception:
        return ""


def classify_and_tag(
    text: str,
    file_type: str = "",
    original_name: str = "",
    base_url: str = "http://localhost:11434",
    model: str = "qwen2.5:7b"
) -> dict:
    """Send text to LLM for classification, tagging, titling, and summarization.

    Returns:
        {
            "category": "document" | "image" | "video" | "other",
            "title": str,
            "tags": [{"name": str, "color": str}, ...],
            "summary": str,
        }
        On failure, returns empty dict.
    """
    if not text.strip():
        return {}

    try:
        client = ollama.Client(host=base_url, proxy=None, trust_env=False)
        prompt = f"""分析以下文本，返回一个 JSON 对象（不要markdown代码块，只返回纯JSON）。

JSON 格式：
{{
  "category": "document",
  "title": "简洁准确的中文标题（15字以内）",
  "tags": [{{"name": "标签1", "color": "#3b82f6"}}, {{"name": "标签2", "color": "#10b981"}}],
  "summary": "2-3句话的中文摘要"
}}

规则：
- category 只返回: document, image, video, other
- title 根据内容提炼一个有意义的中文标题
- tags 返回2-5个标签，每个包含name和color，color从以下选: #3b82f6(蓝), #10b981(绿), #f59e0b(橙), #ef4444(红), #8b5cf6(紫), #ec4899(粉), #06b6d4(青)
- summary 不要太长

文件名：{original_name}
文件类型：{file_type}

文本内容：
{text[:2000]}
"""
        response = client.chat(model=model, messages=[{"role": "user", "content": prompt}])
        content = response['message']['content'].strip()
        # Strip markdown code fences if present
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        return json.loads(content)
    except json.JSONDecodeError:
        return {}
    except Exception:
        return {}
