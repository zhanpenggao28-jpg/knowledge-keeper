from fastapi import APIRouter, Query
from database.engine import get_db
from services.fts_indexer import search_items

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
def search(
    q: str = Query(..., min_length=1),
    category: str | None = Query(None),
    tag_id: int | None = Query(None),
    limit: int = Query(50, ge=1, le=200)
):
    with get_db() as db:
        results = search_items(db, q, category, tag_id, limit)

        for item in results:
            tag_rows = db.execute(
                "SELECT t.* FROM tags t JOIN item_tags it ON t.id = it.tag_id WHERE it.item_id = ?",
                [item['id']]
            ).fetchall()
            item['tags'] = [dict(t) for t in tag_rows]

        return {"items": results, "total": len(results)}
