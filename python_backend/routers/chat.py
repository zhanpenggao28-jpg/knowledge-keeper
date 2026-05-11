import json
from fastapi import APIRouter
from pydantic import BaseModel
from database.engine import get_db

router = APIRouter(prefix="/chat", tags=["chat"])

try:
    import ollama
    HAS_OLLAMA = True
except ImportError:
    HAS_OLLAMA = False


class ChatMessage(BaseModel):
    role: str
    text: str
    action: str | None = None
    result: dict | None = None


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    selected_ids: list[str] = []


SYSTEM_PROMPT = """你是一个知识库管理助手。你可以帮助用户执行文件管理操作。

你必须回复一个 JSON 对象（不要markdown代码块，只返回纯JSON）。

单个操作格式：
{"action": "动作名", "params": {...}, "message": "你的回复文本"}

多个操作格式（用户要一次性做多件事时使用）：
{"actions": [{"action": "...", "params": {...}}, ...], "message": "你的回复文本"}

如果只是闲聊或咨询，action 设为 "none"。

可用操作：

1. search_files — 搜索文件（可搜文件名、文件内容、按标签查找）
   params: { "q": "搜索词(可选，匹配文件名和文档内容)", "file_type": "文件类型(可选:txt,pdf,docx,mp4等)", "category": "分类(可选:document,image,video,other)", "tag_name": "标签名(可选，查找带某标签的文件)" }
   用途：根据关键词找文件、根据描述找图片/视频、查找带特定标签的文件等。

2. batch_rename — 批量重命名（加前缀/后缀，或删除前缀/后缀）
   params: { "item_ids": ["id1","id2"], "prefix": "添加的前缀(可选)", "suffix": "添加的后缀(可选)", "remove_prefix": "要删除的前缀文本(可选)", "remove_suffix": "要删除的后缀文本(可选)" }
   ⚠️ 铁律：只修改用户明确要求的部分！用户说"加前缀D"→只传{"prefix":"D"}；用户说"加后缀_v2"→只传{"suffix":"_v2"}；用户说"去掉开头的旧前缀"→只传{"remove_prefix":"旧前缀"}。绝对不要擅自修改文件名的其他任何部分，不要添加或删除任何用户没要求的文字！
   如果有选中文件，直接用选中ID执行，不需要 search_files。

3. batch_delete — 删除文件（不可恢复！）
   params: { "item_ids": ["id1","id2"] }
   ⚠️ 删除操作不可恢复。必须先向用户确认，得到同意后才能执行。

4. batch_tag — 批量添加标签
   params: { "item_ids": ["id1"], "tag_name": "标签名", "tag_color": "#3b82f6(可选)" }
   ⚠️ 添加标签前先向用户确认。不要在用户未同意的情况下自动打标签。

5. remove_tag — 从文件移除标签
   params: { "item_ids": ["id1"], "tag_name": "标签名(可选，不填则清空所有标签)" }

6. delete_tag — 彻底删除标签（从系统中删除该标签，所有文件上的该标签也会被移除）
   params: { "tag_name": "标签名" }
   ⚠️ 删除前先向用户确认。此操作不可恢复。

7. batch_categorize — 批量修改分类
   params: { "item_ids": ["id1"], "category": "document|image|video|other" }

8. read_document — 读取文档内容
   params: { "item_id": "文件ID" }
   用途：用户想看某个文件的具体内容时使用。先 search_files 找到文件，再读取。

9. create_collection — 创建新的收藏集/文件夹
   params: { "name": "收藏集名", "description": "描述(可选)", "color": "#3b82f6(可选)" }

10. delete_collection — 删除收藏集（会同时解除其中所有文件的关联）
   params: { "collection_name": "收藏集名" }
   ⚠️ 删除前先向用户确认。

11. add_to_collection — 将已有文件添加到收藏集
   params: { "item_ids": ["id1"], "collection_name": "收藏集名" }
   ⚠️ 需要 item_ids。如果收藏集不存在会自动创建。

12. get_stats — 获取库统计
   params: {}

13. none — 不执行操作，仅回复文本
   params: {}

关键规则：
- ⚠️ 最高优先级：如果用户消息开头有【用户选中了这些文件ID: [...]】，表示用户在界面中勾选了这些文件。用户的所有文件操作（加前缀、打标签、删除、分类、加入收藏集等）默认都是针对这些选中文件的。你必须把消息中的ID数组复制到 params.item_ids 中再执行操作，绝对不要再去 search_files！
- 只有在以下情况才使用 search_files：①用户明确说"搜索"/"查找"/"找一下"；②用户说的操作对象不是当前选中文件（如"把所有TXT文件..."）；③用户没有选中任何文件
- ⚠️ batch_rename 铁律：用户说加前缀就只传 prefix，说加后缀就只传 suffix，说删除前缀就只传 remove_prefix，说删除后缀就只传 remove_suffix。严禁自作主张传额外参数！严禁修改文件名的原始文字内容！文件名叫什么就是什么，不要在文件名中间加字、改字或删字。前缀只加在最前面，后缀只加在最后面。
- 你会看到对话历史中之前的操作结果（格式：[操作结果: action -> {json}]）
- 用户说"把这些文件加入收藏集"时，直接用选中ID调用 add_to_collection（收藏集不存在会自动创建，无需单独 create）
- 用户说"创建/新建收藏夹/文件夹" → create_collection
- 用户说"删除收藏夹/删除某收藏集" → delete_collection（先确认）
- 用户说"给文件加前缀/后缀/重命名" → 直接用选中ID执行 batch_rename（不要 search_files）
- 用户说"帮我看看这个文件的内容" → read_document
- 用户说"帮删除标签/去掉标签/移除某文件的标签" → remove_tag
- 用户说"删除标签A/删掉标签/彻底删除标签" → delete_tag（完整删除标签，不是从文件移除）
- 用户说"删除文件/删掉这些文件" → 直接用选中ID执行 batch_delete
- ⚠️ 批量操作（打标签、删除文件）前必须向用户确认
- 用户要求一次性做多件事时，用 actions 数组格式返回多个操作，它们会按顺序执行
- message 字段用中文，友好简洁"""



def _execute_search(params: dict) -> dict:
    q = params.get('q', '')
    file_type = params.get('file_type', '')
    category = params.get('category', '')
    tag_name = params.get('tag_name', '')
    with get_db() as conn:
        conditions = ["1=1"]
        joins = []
        sql_params = []
        if q:
            conditions.append("(i.title LIKE ? OR i.extracted_text LIKE ?)")
            sql_params.extend([f"%{q}%", f"%{q}%"])
        if file_type:
            conditions.append("i.file_type = ?")
            sql_params.append(file_type)
        if category:
            conditions.append("i.category = ?")
            sql_params.append(category)
        if tag_name:
            joins.append("JOIN item_tags it2 ON i.id = it2.item_id JOIN tags t2 ON t2.id = it2.tag_id")
            conditions.append("t2.name = ?")
            sql_params.append(tag_name)
        where = " AND ".join(conditions)
        join_clause = " ".join(joins)
        rows = conn.execute(
            f"SELECT DISTINCT i.id, i.title, i.file_type, i.category, i.original_name, substr(i.extracted_text,1,200) as snippet FROM items i {join_clause} WHERE {where} ORDER BY i.created_at DESC LIMIT 50",
            sql_params
        ).fetchall()
        items = [dict(r) for r in rows]
        return {"items": items, "total": len(items)}


def _execute_batch_rename(params: dict) -> dict:
    item_ids = params.get('item_ids', [])
    prefix = params.get('prefix', '')
    suffix = params.get('suffix', '')
    remove_prefix = params.get('remove_prefix', '')
    remove_suffix = params.get('remove_suffix', '')
    if not item_ids:
        return {"error": "未指定文件"}
    import os as _os
    from config import FILES_DIR
    count = 0
    disk_errors = 0
    with get_db() as conn:
        for item_id in item_ids:
            row = conn.execute(
                "SELECT title, original_name, file_path, original_path FROM items WHERE id = ?",
                [item_id]
            ).fetchone()
            if not row:
                continue
            title = row['title']
            original_name = row['original_name']
            rel_path = row['file_path'] or ''
            orig_path = row['original_path'] or ''

            if remove_prefix and title.startswith(remove_prefix):
                title = title[len(remove_prefix):]
            if remove_suffix and title.endswith(remove_suffix):
                title = title[:-len(remove_suffix)]
            new_title = f"{prefix}{title}{suffix}"

            # Derive new original_name preserving extension
            ext = ''
            name_without_ext = original_name
            if '.' in original_name:
                dot_idx = original_name.rfind('.')
                ext = original_name[dot_idx:]
                name_without_ext = original_name[:dot_idx]
            if name_without_ext == row['title'] or original_name == row['title']:
                new_original_name = new_title + ext
            else:
                new_original_name = original_name

            # Try to rename file on disk (best-effort, don't crash)
            new_orig_path = None
            new_rel_path = None
            try:
                if orig_path and _os.path.exists(orig_path):
                    new_path = _os.path.join(_os.path.dirname(orig_path), new_original_name)
                    if not _os.path.exists(new_path):
                        _os.rename(orig_path, new_path)
                        new_orig_path = new_path
                else:
                    abs_file = _os.path.normpath(_os.path.join(FILES_DIR, rel_path))
                    if _os.path.exists(abs_file):
                        new_abs = _os.path.join(_os.path.dirname(abs_file), new_original_name)
                        if not _os.path.exists(new_abs):
                            _os.rename(abs_file, new_abs)
                            new_rel_path = _os.path.relpath(new_abs, FILES_DIR).replace('\\', '/')
            except Exception:
                disk_errors += 1

            if new_orig_path:
                conn.execute(
                    "UPDATE items SET title = ?, original_name = ?, original_path = ?, updated_at = datetime('now') WHERE id = ?",
                    [new_title, new_original_name, new_orig_path, item_id]
                )
            elif new_rel_path:
                conn.execute(
                    "UPDATE items SET title = ?, original_name = ?, file_path = ?, updated_at = datetime('now') WHERE id = ?",
                    [new_title, new_original_name, new_rel_path, item_id]
                )
            else:
                conn.execute(
                    "UPDATE items SET title = ?, original_name = ?, updated_at = datetime('now') WHERE id = ?",
                    [new_title, new_original_name, item_id]
                )
            count += 1
        conn.commit()
    result = {"renamed": count, "prefix": prefix, "suffix": suffix, "remove_prefix": remove_prefix, "remove_suffix": remove_suffix}
    if disk_errors > 0:
        result["warning"] = f"{disk_errors} 个文件的磁盘重命名失败，但数据库已更新"
    return result


def _execute_batch_tag(params: dict) -> dict:
    item_ids = params.get('item_ids', [])
    tag_name = params.get('tag_name', '')
    tag_color = params.get('tag_color', '#3b82f6')
    if not item_ids or not tag_name:
        return {"error": "参数不完整"}
    with get_db() as conn:
        existing = conn.execute("SELECT id FROM tags WHERE name = ?", [tag_name]).fetchone()
        if existing:
            tag_id = existing['id']
        else:
            cur = conn.execute("INSERT INTO tags (name, color, is_ai_generated) VALUES (?, ?, 1)", [tag_name, tag_color])
            tag_id = cur.lastrowid
        count = 0
        for item_id in item_ids:
            conn.execute("INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)", [item_id, tag_id])
            count += 1
        conn.commit()
    return {"tagged": count, "tag_name": tag_name}


def _execute_batch_categorize(params: dict) -> dict:
    item_ids = params.get('item_ids', [])
    category = params.get('category', '')
    valid = ('document', 'image', 'video', 'other')
    if category not in valid or not item_ids:
        return {"error": "参数无效"}
    count = 0
    with get_db() as conn:
        for item_id in item_ids:
            conn.execute("UPDATE items SET category = ?, updated_at = datetime('now') WHERE id = ?", [category, item_id])
            count += 1
        conn.commit()
    return {"categorized": count, "category": category}


def _execute_add_to_collection(params: dict) -> dict:
    item_ids = params.get('item_ids', [])
    collection_name = params.get('collection_name', '')
    if not item_ids or not collection_name:
        return {"error": "参数不完整"}
    with get_db() as conn:
        existing = conn.execute("SELECT id FROM collections WHERE name = ?", [collection_name]).fetchone()
        created = False
        if existing:
            col_id = existing['id']
        else:
            cur = conn.execute("INSERT INTO collections (name) VALUES (?)", [collection_name])
            col_id = cur.lastrowid
            created = True
        count = 0
        for item_id in item_ids:
            conn.execute("INSERT OR IGNORE INTO collection_items (collection_id, item_id) VALUES (?, ?)", [col_id, item_id])
            count += 1
        conn.commit()
    return {"added": count, "collection": collection_name, "created": created}


def _execute_get_stats(params: dict) -> dict:
    with get_db() as conn:
        total = conn.execute("SELECT COUNT(*) as cnt FROM items").fetchone()['cnt']
        by_cat = conn.execute("SELECT category, COUNT(*) as cnt FROM items GROUP BY category").fetchall()
        by_type = conn.execute("SELECT file_type, COUNT(*) as cnt FROM items GROUP BY file_type ORDER BY cnt DESC LIMIT 10").fetchall()
        tags_cnt = conn.execute("SELECT COUNT(*) as cnt FROM tags").fetchone()['cnt']
        coll_cnt = conn.execute("SELECT COUNT(*) as cnt FROM collections").fetchone()['cnt']
        return {
            "total_files": total,
            "by_category": [dict(r) for r in by_cat],
            "by_file_type": [dict(r) for r in by_type],
            "tag_count": tags_cnt,
            "collection_count": coll_cnt
        }


def _execute_batch_delete(params: dict) -> dict:
    item_ids = params.get('item_ids', [])
    if not item_ids:
        return {"error": "未指定文件"}
    count = 0
    with get_db() as conn:
        for item_id in item_ids:
            conn.execute("DELETE FROM items WHERE id = ?", [item_id])
            count += 1
        conn.commit()
    return {"deleted_files": count}


def _execute_delete_collection(params: dict) -> dict:
    collection_name = params.get('collection_name', '')
    if not collection_name:
        return {"error": "未指定收藏集名称"}
    with get_db() as conn:
        row = conn.execute("SELECT id FROM collections WHERE name = ?", [collection_name]).fetchone()
        if not row:
            return {"error": f"收藏集「{collection_name}」不存在"}
        conn.execute("DELETE FROM collection_items WHERE collection_id = ?", [row['id']])
        conn.execute("DELETE FROM collections WHERE id = ?", [row['id']])
        conn.commit()
    return {"deleted": True, "collection": collection_name}


def _execute_create_collection(params: dict) -> dict:
    name = params.get('name', '')
    description = params.get('description', '')
    color = params.get('color', '#3b82f6')
    if not name:
        return {"error": "收藏集名称不能为空"}
    with get_db() as conn:
        existing = conn.execute("SELECT id FROM collections WHERE name = ?", (name,)).fetchone()
        if existing:
            return {"error": f"收藏集「{name}」已存在", "collection_id": existing['id']}
        cur = conn.execute(
            "INSERT INTO collections (name, description, color) VALUES (?, ?, ?)",
            (name, description, color)
        )
        conn.commit()
        return {"created": True, "name": name, "id": cur.lastrowid}


def _execute_remove_tag(params: dict) -> dict:
    item_ids = params.get('item_ids', [])
    tag_name = params.get('tag_name', '')
    if not item_ids:
        return {"error": "未指定文件"}
    with get_db() as conn:
        count = 0
        for item_id in item_ids:
            if tag_name:
                # Remove specific tag from item
                tag_row = conn.execute("SELECT id FROM tags WHERE name = ?", [tag_name]).fetchone()
                if tag_row:
                    conn.execute("DELETE FROM item_tags WHERE item_id = ? AND tag_id = ?", [item_id, tag_row['id']])
                    count += 1
            else:
                # Remove all tags from item
                cur = conn.execute("DELETE FROM item_tags WHERE item_id = ?", [item_id])
                count += cur.rowcount
        conn.commit()
    detail = f"标签「{tag_name}」" if tag_name else "所有标签"
    return {"removed_from": count, "detail": detail}


def _execute_read_document(params: dict) -> dict:
    item_id = params.get('item_id', '')
    if not item_id:
        return {"error": "未指定文件ID"}
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, title, original_name, file_type, category, extracted_text, summary FROM items WHERE id = ?",
            [item_id]
        ).fetchone()
        if not row:
            return {"error": "文件不存在"}
        return {
            "id": row['id'],
            "title": row['title'],
            "original_name": row['original_name'],
            "file_type": row['file_type'],
            "category": row['category'],
            "extracted_text": (row['extracted_text'] or '')[:3000],
            "summary": row['summary'] or ''
        }


def _execute_delete_tag(params: dict) -> dict:
    tag_name = params.get('tag_name', '')
    if not tag_name:
        return {"error": "未指定标签名称"}
    with get_db() as conn:
        row = conn.execute("SELECT id FROM tags WHERE name = ?", [tag_name]).fetchone()
        if not row:
            return {"error": f"标签「{tag_name}」不存在"}
        conn.execute("DELETE FROM item_tags WHERE tag_id = ?", [row['id']])
        conn.execute("DELETE FROM tags WHERE id = ?", [row['id']])
        conn.commit()
    return {"deleted_tag": True, "tag_name": tag_name}


def _sanitize_rename_params(params: dict, user_message: str) -> dict:
    """Filter out rename params the user didn't explicitly ask for.
    Small models tend to hallucinate extra prefix/suffix even when user only asked for one thing.
    """
    msg = user_message
    wants_prefix = any(kw in msg for kw in ['前缀', '加前缀', '添加前缀', '前面加', '开头加'])
    wants_remove_prefix = any(kw in msg for kw in ['删除前缀', '去掉前缀', '去除前缀', '移除前缀', '删前缀', '去前缀'])
    wants_suffix = any(kw in msg for kw in ['后缀', '加后缀', '添加后缀', '后面加', '末尾加', '结尾加'])
    wants_remove_suffix = any(kw in msg for kw in ['删除后缀', '去掉后缀', '去除后缀', '移除后缀', '删后缀', '去后缀'])

    clean = {}
    if wants_remove_prefix and params.get('remove_prefix'):
        clean['remove_prefix'] = params['remove_prefix']
        clean['item_ids'] = params.get('item_ids', [])
    elif wants_prefix and params.get('prefix'):
        clean['prefix'] = params['prefix']
        clean['item_ids'] = params.get('item_ids', [])
    elif wants_remove_suffix and params.get('remove_suffix'):
        clean['remove_suffix'] = params['remove_suffix']
        clean['item_ids'] = params.get('item_ids', [])
    elif wants_suffix and params.get('suffix'):
        clean['suffix'] = params['suffix']
        clean['item_ids'] = params.get('item_ids', [])
    else:
        # Fallback: only pass what the model set, but never mix add+remove for same position
        has_add_prefix = bool(params.get('prefix'))
        has_remove_prefix = bool(params.get('remove_prefix'))
        has_add_suffix = bool(params.get('suffix'))
        has_remove_suffix = bool(params.get('remove_suffix'))
        clean['item_ids'] = params.get('item_ids', [])
        # If both add and remove on same side, keep only the first clear intent
        if has_add_prefix and not has_remove_prefix:
            clean['prefix'] = params['prefix']
        elif has_remove_prefix and not has_add_prefix:
            clean['remove_prefix'] = params['remove_prefix']
        elif has_add_prefix and has_remove_prefix:
            clean['prefix'] = params['prefix']
        if has_add_suffix and not has_remove_suffix:
            clean['suffix'] = params['suffix']
        elif has_remove_suffix and not has_add_suffix:
            clean['remove_suffix'] = params['remove_suffix']
        elif has_add_suffix and has_remove_suffix:
            clean['suffix'] = params['suffix']

    return clean


ACTION_MAP = {
    "search_files": _execute_search,
    "batch_rename": _execute_batch_rename,
    "batch_tag": _execute_batch_tag,
    "batch_categorize": _execute_batch_categorize,
    "add_to_collection": _execute_add_to_collection,
    "create_collection": _execute_create_collection,
    "delete_collection": _execute_delete_collection,
    "remove_tag": _execute_remove_tag,
    "batch_delete": _execute_batch_delete,
    "delete_tag": _execute_delete_tag,
    "read_document": _execute_read_document,
    "get_stats": _execute_get_stats,
}


@router.post("")
def chat(body: ChatRequest):
    if not HAS_OLLAMA:
        return {"message": "Ollama 未安装，无法使用 AI 助手", "action": "none", "result": None}

    try:
        from config import OLLAMA_BASE_URL, OLLAMA_MODEL
        client = ollama.Client(host=OLLAMA_BASE_URL, proxy=None, trust_env=False)

        # Build conversation messages with history
        ollama_messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        for h in body.history[-10:]:  # Keep last 10 turns
            role = "assistant" if h.role == "ai" else "user"
            content = h.text
            if h.result and h.action and h.action != "none":
                content += f"\n[操作结果: {h.action} -> {h.result}]"
            ollama_messages.append({"role": role, "content": content})

        # Inject selected files context if any
        user_content = body.message
        if body.selected_ids:
            user_content = f"【用户选中了这些文件ID: {body.selected_ids}】\n\n{body.message}"

        ollama_messages.append({"role": "user", "content": user_content})

        response = client.chat(
            model=OLLAMA_MODEL,
            messages=ollama_messages,
            options={"temperature": 0.1}
        )
        content = response['message']['content'].strip()

        # Parse JSON response
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

        parsed = json.loads(content)
        message = parsed.get('message', '')

        # Support both single action and batch actions
        ID_ACTIONS = {'batch_rename', 'batch_tag', 'batch_categorize', 'add_to_collection', 'batch_delete', 'remove_tag'}
        if 'actions' in parsed:
            # Batch mode: execute multiple actions sequentially
            results = []
            for act in parsed['actions']:
                a = act.get('action', 'none')
                p = act.get('params', {})
                if a in ID_ACTIONS and not p.get('item_ids') and body.selected_ids:
                    p['item_ids'] = list(body.selected_ids)
                if a == 'batch_rename':
                    p = _sanitize_rename_params(p, body.message)
                r = None
                if a in ACTION_MAP:
                    try:
                        r = ACTION_MAP[a](p)
                    except Exception as e:
                        r = {"error": str(e)}
                results.append({"action": a, "params": p, "result": r})
            return {
                "message": message,
                "action": "batch",
                "results": results
            }
        else:
            # Single action mode
            action = parsed.get('action', 'none')
            params = parsed.get('params', {})
            if action in ID_ACTIONS and not params.get('item_ids') and body.selected_ids:
                params['item_ids'] = list(body.selected_ids)
            if action == 'batch_rename':
                params = _sanitize_rename_params(params, body.message)
            result = None
            if action in ACTION_MAP:
                try:
                    result = ACTION_MAP[action](params)
                except Exception as e:
                    result = {"error": str(e)}
            return {
                "message": message,
                "action": action,
                "result": result
            }
    except json.JSONDecodeError:
        # If LLM didn't return valid JSON, return the raw text as message
        return {"message": content, "action": "none", "result": None}
    except Exception as e:
        return {"message": f"AI 服务异常：{str(e)}", "action": "none", "result": None}
