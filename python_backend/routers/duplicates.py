from fastapi import APIRouter
from database.engine import get_db

router = APIRouter(prefix="/duplicates", tags=["duplicates"])


@router.get("")
def list_duplicates():
    with get_db() as db:
        rows = db.execute(
            """SELECT file_hash, COUNT(*) as cnt
               FROM items
               WHERE file_hash IS NOT NULL AND file_hash != ''
               GROUP BY file_hash
               HAVING cnt > 1
               ORDER BY cnt DESC"""
        ).fetchall()

        groups = []
        for row in rows:
            items_rows = db.execute(
                """SELECT i.id, i.title, i.original_name, i.file_type, i.category,
                          i.file_path, i.file_size, i.file_hash, i.original_path,
                          i.thumbnail, i.created_at
                   FROM items i
                   WHERE i.file_hash = ?
                   ORDER BY i.created_at ASC""",
                [row['file_hash']]
            ).fetchall()

            tag_rows = db.execute(
                """SELECT it.item_id, t.id, t.name, t.color, t.is_ai_generated
                   FROM tags t
                   JOIN item_tags it ON t.id = it.tag_id
                   WHERE it.item_id IN ({})""".format(
                    ','.join('?' for _ in items_rows)
                ),
                [r['id'] for r in items_rows]
            ).fetchall()

            tag_map: dict[str, list] = {}
            for tr in tag_rows:
                tag_map.setdefault(tr['item_id'], []).append({
                    'id': tr['id'], 'name': tr['name'],
                    'color': tr['color'], 'is_ai_generated': bool(tr['is_ai_generated'])
                })

            items = []
            for ir in items_rows:
                d = dict(ir)
                d['tags'] = tag_map.get(ir['id'], [])
                items.append(d)

            groups.append({
                'hash': row['file_hash'],
                'count': row['cnt'],
                'items': items
            })

        return {'groups': groups}
