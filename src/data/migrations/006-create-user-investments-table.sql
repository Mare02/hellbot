-- Migration 006: Create User Investments Table
-- This table tracks which user owns which investment and when they last collected payouts.

CREATE TABLE IF NOT EXISTS user_investments (
    user_id TEXT NOT NULL,
    investment_id INTEGER NOT NULL,
    purchase_date INTEGER NOT NULL,
    last_payout_date INTEGER NOT NULL,
    PRIMARY KEY (user_id, investment_id),
    FOREIGN KEY (investment_id) REFERENCES investments(id)
); 