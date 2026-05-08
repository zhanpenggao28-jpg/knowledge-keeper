import asyncio
import os
from database.engine import get_connection
from services.text_extractor import process_text_extraction
import config


async def run_processor(stop_event: asyncio.Event):
    while not stop_event.is_set():
        try:
            conn = get_connection()
            job = conn.execute(
                "SELECT * FROM processing_jobs WHERE status = 'pending' ORDER BY priority DESC, created_at ASC LIMIT 1"
            ).fetchone()
            conn.close()

            if job:
                item_id = job['item_id']
                task_type = job['task_type']
                item = None

                conn = get_connection()
                conn.execute(
                    "UPDATE processing_jobs SET status = 'running', started_at = datetime('now') WHERE id = ?",
                    [job['id']]
                )
                conn.commit()
                conn.close()

                try:
                    if task_type == 'text_extract':
                        process_text_extraction(item_id)
                    elif task_type == 'thumbnail':
                        _process_thumbnail(item_id)

                    conn = get_connection()
                    conn.execute(
                        "UPDATE processing_jobs SET status = 'done', finished_at = datetime('now') WHERE id = ?",
                        [job['id']]
                    )
                    conn.commit()
                    conn.close()
                except Exception as e:
                    conn = get_connection()
                    conn.execute(
                        "UPDATE processing_jobs SET status = 'failed', error_msg = ? WHERE id = ?",
                        [str(e), job['id']]
                    )
                    conn.commit()
                    conn.close()
            else:
                await asyncio.sleep(2)
        except Exception:
            await asyncio.sleep(5)

    print("Processor worker stopped")


def _process_thumbnail(item_id: str):
    from services.thumbnail import generate_thumbnail, generate_preview
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM items WHERE id = ?", [item_id]).fetchone()
        if not row:
            return
        full_path = os.path.join(config.FILES_DIR, row['file_path'])
        if not os.path.exists(full_path):
            return

        # Thumbnail for list/grid
        rel = generate_thumbnail(full_path, row['file_type'], row['category'])
        if rel:
            conn.execute(
                "UPDATE items SET thumbnail = ?, updated_at = datetime('now') WHERE id = ?",
                [rel, item_id]
            )

        # Preview for detail panel (max 1920px)
        preview_rel = generate_preview(full_path, row['file_type'], row['category'])
        if preview_rel:
            conn.execute(
                "UPDATE items SET preview = ?, updated_at = datetime('now') WHERE id = ?",
                [preview_rel, item_id]
            )

        conn.commit()
    finally:
        conn.close()
