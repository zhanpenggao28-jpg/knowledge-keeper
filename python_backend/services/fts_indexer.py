import sqlite3

try:
    import jieba
    HAS_JIEBA = True
except Exception:
    HAS_JIEBA = False


def search_items(
    db: sqlite3.Connection,
    query: str,
    category: str | None = None,
    tag_id: int | None = None,
    limit: int = 50
) -> list[dict]:
    if HAS_JIEBA:
        tokenized = " ".join(jieba.cut_for_search(query))
        fts_query = f'("{query}" OR {tokenized})'
    else:
        fts_query = f'"{query}"'

    conditions = ["items_fts MATCH ?"]
    params = [fts_query]

    if category:
        conditions.append("items.category = ?")
        params.append(category)
    if tag_id is not None:
        conditions.append("items.id IN (SELECT item_id FROM item_tags WHERE tag_id = ?)")
        params.append(tag_id)

    where = " AND ".join(conditions)

    rows = db.execute(
        f"""SELECT items.*,
                   snippet(items_fts, 1, '<mark>', '</mark>', '...', 40) AS snippet
            FROM items_fts
            JOIN items ON items.rowid = items_fts.rowid
            WHERE {where}
            ORDER BY rank
            LIMIT ?""",
        params + [limit]
    ).fetchall()

    return [dict(r) for r in rows]
