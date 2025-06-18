-- In this migration, we are adding a 'stats' column to the 'items' table.
-- This column will store JSON data to provide items with attributes like power for weapons or defense for armor.
-- Example: '{"type": "weapon", "power": 10}' or '{"type": "armor", "defense": 5}'

ALTER TABLE items ADD COLUMN stats TEXT;