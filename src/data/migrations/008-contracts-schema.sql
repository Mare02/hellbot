-- src/data/migrations/008-contracts-schema.sql

-- Contracts Table: Stores available contracts for users to complete.
CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    reward INTEGER NOT NULL,
    -- requirements will store JSON data, e.g., {"min_rank": 5, "required_weapon_power": 50}
    requirements TEXT,
    expires_at TEXT NOT NULL, -- ISO 8601 format
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- User Contracts Table: Tracks the relationship between users and their accepted contracts.
CREATE TABLE IF NOT EXISTS user_contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    contract_id INTEGER NOT NULL,
    -- status can be 'in_progress', 'completed', or 'failed'
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'completed', 'failed')),
    accepted_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT, -- Timestamp of completion or failure
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
);