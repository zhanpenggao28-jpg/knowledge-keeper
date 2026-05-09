from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database.engine import get_db

router = APIRouter(prefix="/collections", tags=["collections"])


class CollectionCreate(BaseModel):
    name: str
    description: str = ""
    color: str = "#888890"


class CollectionUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    color: str | None = None


class ItemIdsBody(BaseModel):
    item_ids: list[str]


@router.get("")
def list_collections():
    with get_db() as conn:
        rows = conn.execute(
            """SELECT c.*, COUNT(ci.item_id) as item_count
               FROM collections c
               LEFT JOIN collection_items ci ON ci.collection_id = c.id
               GROUP BY c.id
               ORDER BY c.name"""
        ).fetchall()
        return [dict(r) for r in rows]


@router.post("")
def create_collection(body: CollectionCreate):
    with get_db() as conn:
        existing = conn.execute("SELECT id FROM collections WHERE name = ?", (body.name,)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="收藏集名称已存在")
        cur = conn.execute(
            "INSERT INTO collections (name, description, color) VALUES (?, ?, ?)",
            (body.name, body.description, body.color)
        )
        conn.commit()
        return {"id": cur.lastrowid, "name": body.name, "description": body.description, "color": body.color, "item_count": 0}


@router.put("/{collection_id}")
def update_collection(collection_id: int, body: CollectionUpdate):
    with get_db() as conn:
        row = conn.execute("SELECT id FROM collections WHERE id = ?", (collection_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="收藏集不存在")
        fields = {k: v for k, v in body.dict().items() if v is not None}
        if fields:
            set_clause = ", ".join(f"{k} = ?" for k in fields)
            conn.execute(f"UPDATE collections SET {set_clause}, updated_at = datetime('now') WHERE id = ?",
                         (*fields.values(), collection_id))
            conn.commit()
        return {"ok": True}


@router.delete("/{collection_id}")
def delete_collection(collection_id: int):
    with get_db() as conn:
        row = conn.execute("SELECT id FROM collections WHERE id = ?", (collection_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="收藏集不存在")
        conn.execute("DELETE FROM collections WHERE id = ?", (collection_id,))
        conn.commit()
        return {"ok": True}


@router.post("/{collection_id}/items")
def add_items_to_collection(collection_id: int, body: ItemIdsBody):
    with get_db() as conn:
        row = conn.execute("SELECT id FROM collections WHERE id = ?", (collection_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="收藏集不存在")
        for item_id in body.item_ids:
            conn.execute(
                "INSERT OR IGNORE INTO collection_items (collection_id, item_id) VALUES (?, ?)",
                (collection_id, item_id)
            )
        conn.commit()
        return {"ok": True}


@router.delete("/{collection_id}/items")
def remove_items_from_collection(collection_id: int, body: ItemIdsBody):
    with get_db() as conn:
        for item_id in body.item_ids:
            conn.execute(
                "DELETE FROM collection_items WHERE collection_id = ? AND item_id = ?",
                (collection_id, item_id)
            )
        conn.commit()
        return {"ok": True}
