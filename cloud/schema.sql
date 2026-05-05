-- Hansoom Cloud — D1 schema
-- Diagram metadata lives here; the rendered HTML blobs live in R2.

CREATE TABLE IF NOT EXISTS diagrams (
  id              TEXT    PRIMARY KEY,  -- 8-char base62
  owner_github_id TEXT,                 -- nullable for future migration
  owner_login     TEXT,                 -- GitHub username
  title           TEXT    NOT NULL DEFAULT '',
  source_hash     TEXT    NOT NULL,     -- SHA-256 of mermaid source
  created_at      TEXT    NOT NULL,     -- ISO 8601
  view_count      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_diagrams_owner ON diagrams(owner_github_id);
CREATE INDEX IF NOT EXISTS idx_diagrams_created ON diagrams(created_at);

-- Rate limiting: sliding-window counters.
-- key = "anon:<ip-hash>" or "user:<github-id>"
-- window = "render" or "save"
CREATE TABLE IF NOT EXISTS rate_limits (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  key    TEXT    NOT NULL,
  window TEXT    NOT NULL,
  ts     TEXT    NOT NULL  -- ISO 8601
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON rate_limits(key, window, ts);
