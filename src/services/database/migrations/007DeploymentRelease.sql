CREATE TABLE deployment_release (
  profile TEXT PRIMARY KEY CHECK (profile IN ('dev', 'prod')),
  sha TEXT NOT NULL,
  run_id TEXT,
  run_attempt INTEGER NOT NULL CHECK (run_attempt > 0),
  verified_at TEXT NOT NULL
);
