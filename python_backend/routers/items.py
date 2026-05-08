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


class ItemUpdate(BaseModel):
    title: str | None = None
    tag_ids: list[int] | None = None


@router.post("")
def create_item(body: ItemCreate):
    item_id = str(uuid.uuid4())
    with get_db() as db:
        db.execute(
            """INSERT INTO items (id, title, file_type, category, file_path, original_name, file_size, file_hash)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            [item_id, body.title, body.fileType, body.category, body.filePath, body.originalName, body.fileSize, body.fileHash]
        )
        db.execute(
            "INSERT INTO processing_jobs (item_id, task_type, priority) VALUES (?, 'text_extract', 10)",
            [item_id]
        )
        db.execute(
            "INSERT INTO processing_jobs (item_id, task_type, priority) VALUES (?, 'thumbnail', 5)",
            [item_id]
        )
    return {"id": item_id, "title": body.title, "status": "pending"}


@router.get("")
def list_items(
    category: str | None = Query(None),
    status: str | None = Query(None),
    tag_id: int | None = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200)
):
    with get_db() as db:
        conditions = []
        params = []

        if category:
            conditions.append("i.category = ?")
            params.append(category)
        if status:
            conditions.append("i.status = ?")
            params.append(status)
        if tag_id is not None:
            conditions.append("it.tag_id = ?")
            params.append(tag_id)

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        if tag_id is not None:
            join_clause = "JOIN item_tags it ON i.id = it.item_id"
        else:
            join_clause = ""

        rows = db.execute(
            f"""SELECT i.id, i.title, i.file_type, i.category, i.file_path,
                       i.original_name, i.file_size, i.file_hash, i.thumbnail, i.preview,
                       substr(i.extracted_text, 1, 200) as extracted_text,
                       i.summary, i.status, i.error_msg, i.duration, i.page_count,
                       i.created_at, i.updated_at
                FROM items i {join_clause}
                WHERE {where_clause}
                ORDER BY i.created_at DESC
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

        for item in items:
            tag_rows = db.execute(
                "SELECT t.* FROM tags t JOIN item_tags it ON t.id = it.tag_id WHERE it.item_id = ?",
                [item['id']]
            ).fetchall()
            item['tags'] = [dict(t) for t in tag_rows]

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
    return {"ok": True}
