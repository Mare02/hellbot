CREATE TABLE profiles (
  id INTEGER PRIMARY KEY,
  env TEXT NOT NULL UNIQUE CHECK (env IN ('dev', 'prod')),
  name TEXT NOT NULL,
  profile_image_url TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE profile_configs (
  profile_id INTEGER PRIMARY KEY REFERENCES profiles(id),
  config_json TEXT NOT NULL CHECK (json_valid(config_json) AND json_type(config_json) = 'object'),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE secrets (
  id INTEGER PRIMARY KEY,
  provider TEXT NOT NULL,
  label TEXT,
  encrypted_value BLOB NOT NULL,
  nonce BLOB NOT NULL,
  auth_tag BLOB NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE config_history (
  id INTEGER PRIMARY KEY,
  profile_id INTEGER REFERENCES profiles(id),
  action TEXT NOT NULL,
  changed_paths_json TEXT CHECK (
    changed_paths_json IS NULL
    OR (json_valid(changed_paths_json) AND json_type(changed_paths_json) = 'array')
  ),
  config_snapshot_json TEXT CHECK (
    config_snapshot_json IS NULL
    OR (json_valid(config_snapshot_json) AND json_type(config_snapshot_json) = 'object')
  ),
  metadata_json TEXT CHECK (
    metadata_json IS NULL
    OR (json_valid(metadata_json) AND json_type(metadata_json) = 'object')
  ),
  actor TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX secrets_provider_idx ON secrets(provider);
CREATE INDEX config_history_created_at_idx ON config_history(created_at DESC, id DESC);
CREATE INDEX config_history_profile_created_at_idx ON config_history(profile_id, created_at DESC, id DESC);

INSERT INTO profiles (env, name)
VALUES ('dev', 'Development'), ('prod', 'Production')
ON CONFLICT(env) DO NOTHING;
