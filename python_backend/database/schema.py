SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS items (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    file_type   TEXT NOT NULL,
    category    TEXT NOT NULL,
    file_path   TEXT NOT NULL UNIQUE,
    original_name TEXT NOT NULL,
    file_size   INTEGER NOT NULL,
    file_hash   TEXT,
    thumbnail   TEXT,
    preview     TEXT,
    extracted_text TEXT DEFAULT '',
    summary     TEXT DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'pending',
    error_msg   TEXT,
    duration    REAL,
    page_count  INTEGER,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_status   ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_created  ON items(created_at);

CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
    title,
    extracted_text,
    summary,
    content='items',
    content_rowid='rowid',
    tokenize='unicode61 remove_diacritics 2'
);

CREATE TRIGGER IF NOT EXISTS items_fts_ai AFTER INSERT ON items BEGIN
    INSERT INTO items_fts(rowid, title, extracted_text, summary)
    VALUES (new.rowid, new.title, new.extracted_text, new.summary);
END;

CREATE TRIGGER IF NOT EXISTS items_fts_ad AFTER DELETE ON items BEGIN
    INSERT INTO items_fts(items_fts, rowid, title, extracted_text, summary)
    VALUES ('delete', old.rowid, old.title, old.extracted_text, old.summary);
END;

CREATE TRIGGER IF NOT EXISTS items_fts_au AFTER UPDATE ON items BEGIN
    INSERT INTO items_fts(items_fts, rowid, title, extracted_text, summary)
    VALUES ('delete', old.rowid, old.title, old.extracted_text, old.summary);
    INSERT INTO items_fts(rowid, title, extracted_text, summary)
    VALUES (new.rowid, new.title, new.extracted_text, new.summary);
END;

CREATE TABLE IF NOT EXISTS tags (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL UNIQUE,
    color           TEXT DEFAULT '#1677ff',
    is_ai_generated INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS item_tags (
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_item_tags_tag ON item_tags(tag_id);

CREATE TABLE IF NOT EXISTS processing_jobs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id     TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    task_type   TEXT NOT NULL,
    priority    INTEGER NOT NULL DEFAULT 0,
    status      TEXT NOT NULL DEFAULT 'pending',
    error_msg   TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    started_at  TEXT,
    finished_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON processing_jobs(status, priority);
CREATE INDEX IF NOT EXISTS idx_jobs_item   ON processing_jobs(item_id);

CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO settings (key, value) VALUES
    ('ollama_base_url', 'http://localhost:11434'),
    ('ollama_model', 'qwen2.5:7b'),
    ('whisper_model', 'base'),
    ('ocr_engine', 'paddleocr'),
    ('language', 'zh-CN'),
    ('storage_path', '');
"""
