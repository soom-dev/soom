-- Hansoom CLI telemetry — D1 schema
-- Columns are pinned to the 10 allowlisted payload fields plus a server-side
-- received_at. No IP column. No headers logged. The set of columns IS the set
-- of fields the receiver will accept; adding a column is the only way to log
-- a new field and is therefore reviewed in the same PR as the CLI sender.

CREATE TABLE IF NOT EXISTS renders (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  ts             TEXT    NOT NULL,  -- client-provided ISO timestamp
  received_at    TEXT    NOT NULL,  -- server-side ISO timestamp
  version        TEXT    NOT NULL,
  os             TEXT    NOT NULL,
  node_count     INTEGER NOT NULL,
  edge_count     INTEGER NOT NULL,
  has_subgraphs  INTEGER NOT NULL,  -- 0 or 1
  theme          TEXT    NOT NULL,
  used_open      INTEGER NOT NULL,  -- 0 or 1
  render_time_ms INTEGER NOT NULL,
  diagram_type   TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_renders_ts ON renders(ts);
