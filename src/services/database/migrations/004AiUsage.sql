CREATE TABLE ai_api_calls (
  id TEXT PRIMARY KEY,
  run_id TEXT,
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  provider TEXT NOT NULL,
  model TEXT,
  operation TEXT NOT NULL,
  endpoint TEXT,
  method TEXT NOT NULL,
  attempt INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_ms INTEGER,
  status_code INTEGER,
  outcome TEXT NOT NULL CHECK (outcome IN ('pending', 'success', 'error')),
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  cached_tokens INTEGER,
  reasoning_tokens INTEGER,
  request_json TEXT NOT NULL CHECK (json_valid(request_json)),
  request_headers_json TEXT CHECK (request_headers_json IS NULL OR json_valid(request_headers_json)),
  response_json TEXT CHECK (response_json IS NULL OR json_valid(response_json)),
  response_headers_json TEXT CHECK (response_headers_json IS NULL OR json_valid(response_headers_json)),
  error_json TEXT CHECK (error_json IS NULL OR json_valid(error_json))
);
CREATE INDEX ai_api_calls_profile_date_idx ON ai_api_calls(profile_id, started_at DESC, id DESC);
CREATE INDEX ai_api_calls_date_idx ON ai_api_calls(started_at);
