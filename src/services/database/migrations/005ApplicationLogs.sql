CREATE TABLE application_logs (
  id INTEGER PRIMARY KEY,
  timestamp TEXT NOT NULL,
  profile TEXT NOT NULL CHECK (profile IN ('dev', 'prod', 'dashboard')),
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  component TEXT NOT NULL,
  command TEXT,
  message TEXT NOT NULL,
  context_json TEXT CHECK (context_json IS NULL OR json_valid(context_json)),
  search_text TEXT NOT NULL,
  legacy_hash TEXT UNIQUE
);

CREATE INDEX application_logs_timestamp_idx ON application_logs(timestamp);
CREATE INDEX application_logs_profile_timestamp_idx ON application_logs(profile, timestamp DESC, id DESC);
CREATE INDEX application_logs_profile_level_timestamp_idx ON application_logs(profile, level, timestamp DESC, id DESC);
CREATE INDEX application_logs_profile_component_timestamp_idx ON application_logs(profile, component, timestamp DESC, id DESC);
CREATE INDEX application_logs_profile_command_timestamp_idx ON application_logs(profile, command, timestamp DESC, id DESC);
