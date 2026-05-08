import sqlite3
import os
from contextlib import contextmanager
from .schema import SCHEMA_SQL

_db_path: str | None = None


def init_db(db_path: str):
    global _db_path
    _db_path = db_path
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.executescript(SCHEMA_SQL)
    # Migrations for existing databases
    _run_migrations(conn)
    conn.commit()
    conn.close()


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(_db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _run_migrations(conn: sqlite3.Connection):
    # Add preview column if it doesn't exist (added 2026-05-08)
    cols = [row['name'] for row in conn.execute("PRAGMA table_info(items)").fetchall()]
    if 'preview' not in cols:
        conn.execute("ALTER TABLE items ADD COLUMN preview TEXT")
