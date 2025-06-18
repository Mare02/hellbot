-- Migration 014: Create ranks table and seed it

CREATE TABLE IF NOT EXISTS ranks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    netWorth INTEGER NOT NULL,
    icon TEXT
);

INSERT INTO ranks (name, netWorth, icon) VALUES
('Imp', 0, 'IMP'),
('Goblin', 5000, 'GOBLIN'),
('Thug', 25000, 'THUG'),
('Executioner', 100000, 'EXECUTIONER'),
('Overlord', 500000, 'OVERLORD'),
('Demon Lord', 2000000, 'DEMON');