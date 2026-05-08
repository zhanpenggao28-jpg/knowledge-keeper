from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database.engine import get_db

router = APIRouter(prefix="/tags", tags=["tags"])


class TagCreate(BaseModel):
    name: str
    color: str = '#1677ff'


class TagUpdate(BaseModel):
    name: str | None = None
    color: str | None = None


@router.get("")
def list_tags():
    with get_db() as db:
        rows = db.execute("""
            SELECT t.*, COUNT(it.item_id) as item_count
            FROM tags t
            LEFT JOIN item_tags it ON t.id = it.tag_id
            GROUP BY t.id
            ORDER BY t.name
        """).fetchall()
        return [dict(r) for r in rows]


@router.post("")
def create_tag(body: TagCreate):
    with get_db() as db:
        try:
            cursor = db.execute(
                "INSERT INTO tags (name, color) VALUES (?, ?)",
                [body.name, body.color]
            )
            return {"id": cursor.lastrowid, "name": body.name, "color": body.color}
        except Exception:
            raise HTTPException(status_code=409, detail="标签名已存在")


@router.put("/{tag_id}")
def update_tag(tag_id: int, body: TagUpdate):
    with get_db() as db:
        existing = db.execute("SELECT * FROM tags WHERE id = ?", [tag_id]).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="标签不存在")

        if body.name is not None:
            db.execute("UPDATE tags SET name = ? WHERE id = ?", [body.name, tag_id])
        if body.color is not None:
            db.execute("UPDATE tags SET color = ? WHERE id = ?", [body.color, tag_id])

    return {"ok": True}


@router.delete("/{tag_id}")
def delete_tag(tag_id: int):
    with get_db() as db:
        existing = db.execute("SELECT * FROM tags WHERE id = ?", [tag_id]).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="标签不存在")
        db.execute("DELETE FROM tags WHERE id = ?", [tag_id])
    return {"ok": True}
