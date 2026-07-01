CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  item TEXT NOT NULL,
  lot TEXT NOT NULL,
  type TEXT NOT NULL,
  amount_mkg INTEGER NOT NULL,
  expiry_date TEXT,
  process TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('GREEN', 'ROASTED')),
  note TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_entries_stock ON entries (category, item, lot);
CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entries_lot ON entries (lot);

CREATE TABLE IF NOT EXISTS presets (
  category TEXT PRIMARY KEY CHECK (category IN ('GREEN', 'ROASTED')),
  presets_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

INSERT OR IGNORE INTO presets (category, presets_json) VALUES
('GREEN', '[{"name":"에티오피아 함벨라 G1","process":"허니"},{"name":"콜롬비아 모틸론","process":"워시드"},{"name":"케냐AA FAQ+","process":"워시드"}]'),
('ROASTED', '[{"name":"구스토","process":""}]');
