-- Migration 013: Remove damage attribute from armor items

UPDATE items
SET stats = '{"defense": 40}'
WHERE id = 'hellfire_chainmail';

UPDATE items
SET stats = '{"defense": 100}'
WHERE id = 'soulforged_plate'; 