-- Migration 003: Add Emojis to Categories

-- Add the emoji column to the item_categories table
ALTER TABLE item_categories ADD COLUMN emoji TEXT;

-- Update existing categories with their emojis
UPDATE item_categories SET emoji = '🛠️' WHERE name = 'Tools';
UPDATE item_categories SET emoji = '🚗' WHERE name = 'Cars';
UPDATE item_categories SET emoji = '💍' WHERE name = 'Jewelry';
UPDATE item_categories SET emoji = '💊' WHERE name = 'Drugs';
UPDATE item_categories SET emoji = '🏆' WHERE name = 'Collectibles';
UPDATE item_categories SET emoji = '⚔️' WHERE name = 'Weapons';
UPDATE item_categories SET emoji = '🏛️' WHERE name = 'Property'; 