import uuid
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from database.engine import get_db

router = APIRouter(prefix="/items", tags=["items"])


class ItemCreate(BaseModel):
    title: str
    originalName: str
    fileType: str
    category: str
    filePath: str
    fileSize: int
    fileHash: str
    originalPath: str | None = None


class ItemUpdate(BaseModel):
    title: str | None = None
    tag_ids: list[int] | None = None
    originalName: str | None = None
    extractedText: str | None = None
    fileHash: str | None = None


@router.post("")
def create_item(body: ItemCreate):
    item_id = str(uuid.uuid4())
    with get_db() as db:
        db.execute(
            """INSERT INTO items (id, title, file_type, category, file_path, original_name, file_size, file_hash, original_path)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            [item_id, body.title, body.fileType, body.category, body.filePath, body.originalName, body.fileSize, body.fileHash, body.originalPath]
        )
        db.execute(
            "INSERT INTO processing_jobs (item_id, task_type, priority) VALUES (?, 'text_extract', 10)",
            [item_id]
        )
        db.execute(
            "INSERT INTO processing_jobs (item_id, task_type, priority) VALUES (?, 'thumbnail', 5)",
            [item_id]
        )
        db.execute(
            "INSERT INTO processing_jobs (item_id, task_type, priority) VALUES (?, 'ai_classify', 3)",
            [item_id]
        )
    return {"id": item_id, "title": body.title, "status": "pending"}


SORT_WHITELIST = {"created_at", "title", "file_size", "file_type", "original_name"}

@router.get("")
def list_items(
    category: str | None = Query(None),
    status: str | None = Query(None),
    tag_id: int | None = Query(None),
    collection_id: int | None = Query(None),
    q: str | None = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200)
):
    with get_db() as db:
        conditions = []
        params = []
        joins = []

        if category:
            conditions.append("i.category = ?")
            params.append(category)
        if status:
            conditions.append("i.status = ?")
            params.append(status)
        if tag_id is not None:
            conditions.append("it.tag_id = ?")
            params.append(tag_id)
            joins.append("JOIN item_tags it ON i.id = it.item_id")
        if collection_id is not None:
            conditions.append("ci.collection_id = ?")
            params.append(collection_id)
            joins.append("JOIN collection_items ci ON i.id = ci.item_id")
        if q:
            conditions.append("i.title LIKE ?")
            params.append(f"%{q}%")

        safe_sort = sort_by if sort_by in SORT_WHITELIST else "created_at"
        safe_order = "DESC" if sort_order.lower() == "desc" else "ASC"

        where_clause = " AND ".join(conditions) if conditions else "1=1"
        join_clause = " ".join(joins)

        rows = db.execute(
            f"""SELECT i.id, i.title, i.file_type, i.category, i.file_path,
                       i.original_name, i.file_size, i.file_hash, i.original_path, i.thumbnail, i.preview,
                       substr(i.extracted_text, 1, 200) as extracted_text,
                       i.summary, i.status, i.error_msg, i.duration, i.page_count,
                       i.created_at, i.updated_at
                FROM items i {join_clause}
                WHERE {where_clause}
                ORDER BY i.{safe_sort} {safe_order}
                LIMIT ? OFFSET ?""",
            params + [limit, offset]
        ).fetchall()

        total = db.execute(
            f"SELECT COUNT(*) as cnt FROM items i {join_clause} WHERE {where_clause}",
            params
        ).fetchone()['cnt']

        items = []
        for row in rows:
            items.append(dict(row))

        # Batch-fetch tags for all items (avoid N+1 queries)
        if items:
            item_ids = [item['id'] for item in items]
            placeholders = ','.join(['?' for _ in item_ids])
            tag_rows = db.execute(
                f"""SELECT it.item_id, t.id, t.name, t.color, t.is_ai_generated
                    FROM tags t
                    JOIN item_tags it ON t.id = it.tag_id
                    WHERE it.item_id IN ({placeholders})""",
                item_ids
            ).fetchall()
            tag_map: dict[str, list] = {}
            for tr in tag_rows:
                tag_map.setdefault(tr['item_id'], []).append({
                    'id': tr['id'], 'name': tr['name'],
                    'color': tr['color'], 'is_ai_generated': bool(tr['is_ai_generated'])
                })

            # Batch-fetch collections for all items
            coll_rows = db.execute(
                f"""SELECT ci.item_id, c.id, c.name, c.color
                    FROM collections c
                    JOIN collection_items ci ON c.id = ci.collection_id
                    WHERE ci.item_id IN ({placeholders})""",
                item_ids
            ).fetchall()
            coll_map: dict[str, list] = {}
            for cr in coll_rows:
                coll_map.setdefault(cr['item_id'], []).append({
                    'id': cr['id'], 'name': cr['name'], 'color': cr['color']
                })

            for item in items:
                item['tags'] = tag_map.get(item['id'], [])
                item['collections'] = coll_map.get(item['id'], [])

        return {"items": items, "total": total}


@router.get("/{item_id}")
def get_item(item_id: str):
    with get_db() as db:
        row = db.execute("SELECT * FROM items WHERE id = ?", [item_id]).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="文件不存在")
        item = dict(row)

        tag_rows = db.execute(
            "SELECT t.* FROM tags t JOIN item_tags it ON t.id = it.tag_id WHERE it.item_id = ?",
            [item_id]
        ).fetchall()
        item['tags'] = [dict(t) for t in tag_rows]

        jobs = db.execute(
            "SELECT * FROM processing_jobs WHERE item_id = ? ORDER BY created_at",
            [item_id]
        ).fetchall()
        item['processing_jobs'] = [dict(j) for j in jobs]

        return item


@router.put("/{item_id}")
def update_item(item_id: str, body: ItemUpdate):
    with get_db() as db:
        existing = db.execute("SELECT * FROM items WHERE id = ?", [item_id]).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="文件不存在")

        if body.title is not None:
            db.execute("UPDATE items SET title = ?, updated_at = datetime('now') WHERE id = ?", [body.title, item_id])

        if body.originalName is not None:
            db.execute("UPDATE items SET original_name = ?, updated_at = datetime('now') WHERE id = ?", [body.originalName, item_id])

        if body.extractedText is not None:
            db.execute("UPDATE items SET extracted_text = ?, status = 'done', updated_at = datetime('now') WHERE id = ?", [body.extractedText, item_id])

        if body.fileHash is not None:
            db.execute("UPDATE items SET file_hash = ?, updated_at = datetime('now') WHERE id = ?", [body.fileHash, item_id])

        if body.tag_ids is not None:
            db.execute("DELETE FROM item_tags WHERE item_id = ?", [item_id])
            for tag_id in body.tag_ids:
                db.execute("INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)", [item_id, tag_id])

    return {"ok": True}


@router.delete("/{item_id}")
def delete_item(item_id: str):
    with get_db() as db:
        existing = db.execute("SELECT * FROM items WHERE id = ?", [item_id]).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="文件不存在")
        db.execute("DELETE FROM items WHERE id = ?", [item_id])
    return {"ok": True}


@router.get("/{item_id}/text")
def get_item_text(item_id: str):
    with get_db() as db:
        row = db.execute("SELECT id, title, extracted_text, summary FROM items WHERE id = ?", [item_id]).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="文件不存在")
        return dict(row)


@router.post("/{item_id}/reprocess")
def reprocess_item(item_id: str):
    with get_db() as db:
        existing = db.execute("SELECT * FROM items WHERE id = ?", [item_id]).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="文件不存在")
        db.execute(
            "INSERT INTO processing_jobs (item_id, task_type, priority) VALUES (?, 'text_extract', 10)",
            [item_id]
        )
        db.execute(
            "INSERT INTO processing_jobs (item_id, task_type, priority) VALUES (?, 'thumbnail', 5)",
            [item_id]
        )
        db.execute(
            "INSERT INTO processing_jobs (item_id, task_type, priority) VALUES (?, 'ai_classify', 3)",
            [item_id]
        )
    return {"ok": True}


class RelocateBody(BaseModel):
    original_path: str


@router.put("/{item_id}/relocate")
def relocate_item(item_id: str, body: RelocateBody):
    with get_db() as db:
        existing = db.execute("SELECT * FROM items WHERE id = ?", [item_id]).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="文件不存在")
        db.execute(
            "UPDATE items SET original_path = ?, updated_at = datetime('now') WHERE id = ?",
            [body.original_path, item_id]
        )
    return {"ok": True}
