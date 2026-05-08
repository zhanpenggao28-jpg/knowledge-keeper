from fastapi import APIRouter, HTTPException
from database.engine import get_db

router = APIRouter(prefix="/processing", tags=["processing"])


@router.get("/status/{item_id}")
def get_processing_status(item_id: str):
    with get_db() as db:
        existing = db.execute("SELECT id, status FROM items WHERE id = ?", [item_id]).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="文件不存在")

        jobs = db.execute(
            "SELECT * FROM processing_jobs WHERE item_id = ? ORDER BY created_at DESC",
            [item_id]
        ).fetchall()

        return {
            "item_status": existing['status'],
            "jobs": [dict(j) for j in jobs]
        }
