CREATE TABLE IF NOT EXISTS demo_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS demo_blob (
  key TEXT PRIMARY KEY,
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS demo_entity (
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  payload TEXT NOT NULL,
  PRIMARY KEY (collection, id)
);

CREATE INDEX IF NOT EXISTS idx_demo_entity_collection ON demo_entity (collection);

CREATE TABLE IF NOT EXISTS demo_resident (
  user_id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS demo_event_rsvp (
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY (event_id, user_id)
);
