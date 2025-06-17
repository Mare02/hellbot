-- Migration 005: Create Investments Table
-- This table serves as a catalog for all purchasable assets that generate passive income.

CREATE TABLE IF NOT EXISTS investments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    cost INTEGER NOT NULL,
    payout_amount INTEGER NOT NULL,
    payout_interval_hours INTEGER NOT NULL
);

-- Seed the table with some initial investments
INSERT INTO investments (name, description, cost, payout_amount, payout_interval_hours) VALUES
('Soul Well', 'A minor fissure into the abyss that slowly leaks raw souls.', 10000, 100, 24),
('Imp Farm', 'A small, contained farm where imps perform trivial tasks, generating a modest income.', 50000, 650, 24),
('Demon Gate', 'A powerful gateway that funnels significant soul energy from a lesser dimension.', 250000, 3500, 48); 