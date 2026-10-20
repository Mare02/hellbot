CREATE TABLE profile_guilds (
  profile_id INTEGER PRIMARY KEY REFERENCES profiles(id),
  guilds_json TEXT NOT NULL CHECK (json_valid(guilds_json) AND json_type(guilds_json) = 'array'),
  synced_at TEXT NOT NULL
);
