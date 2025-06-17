-- Migration 001: Initial Schema

-- User data table
CREATE TABLE IF NOT EXISTS users (
    userId TEXT PRIMARY KEY,
    souls INTEGER DEFAULT 0,
    bank INTEGER DEFAULT 0,
    netWorth INTEGER DEFAULT 0,
    lastWork INTEGER DEFAULT 0,
    lastDaily INTEGER DEFAULT 0,
    dailyStreak INTEGER DEFAULT 0,
    rank TEXT DEFAULT 'Imp'
);

-- User inventory table
CREATE TABLE IF NOT EXISTS inventory (
    userId TEXT NOT NULL,
    itemId TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    PRIMARY KEY (userId, itemId)
);

-- Item categories table
CREATE TABLE IF NOT EXISTS item_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

-- Items table
CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    value INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    bonus_type TEXT,
    bonus_value REAL,
    unique_item INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (category_id) REFERENCES item_categories(id)
); 