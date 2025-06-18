-- Migration 011: Rename 'power' to 'damage' for weapon stats
-- This migration updates the JSON stats for all weapon items, renaming the 'power' key to 'damage'.

-- Update stats for all items in the 'Weapons' category (assuming category_id = 6)
-- We need to use json_replace to modify the JSON object.
-- Note: The exact implementation might vary based on the specific capabilities of the SQLite version used.
-- This script assumes a version that supports JSON functions.

UPDATE items
SET stats = REPLACE(stats, '"power":', '"damage":')
WHERE category_id = 6 AND stats LIKE '%"power":%'; 