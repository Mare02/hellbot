-- Migration 010: Add and Update Weapon Stats
-- This migration adds JSON stats to existing weapon items and adds new weapons.

-- Update existing weapons with detailed stats
UPDATE items SET stats = '{"type": "weapon", "power": 25, "damage_type": "fire", "speed": 5, "crit_chance": 0.1}' WHERE id = 'hellfire_sword';
UPDATE items SET stats = '{"type": "weapon", "power": 40, "damage_type": "soul", "speed": 2, "crit_chance": 0.2}' WHERE id = 'soul_reaper_scythe';
UPDATE items SET stats = '{"type": "weapon", "power": 30, "damage_type": "physical", "speed": 7, "crit_chance": 0.15}' WHERE id = 'demon_crossbow';
UPDATE items SET stats = '{"type": "weapon", "power": 20, "damage_type": "physical", "speed": 8, "crit_chance": 0.05}' WHERE id = 'torture_whip';
UPDATE items SET stats = '{"type": "weapon", "power": 22, "damage_type": "physical", "speed": 3, "crit_chance": 0.05}' WHERE id = 'brimstone_mace';

-- Add new weapons
INSERT INTO items (id, name, description, price, value, category_id, unique_item, stats) VALUES
('shadow_dagger', 'Shadow Dagger', 'Perfect for a silent but deadly approach.', 40000, 40000, 6, 1, '{"type": "weapon", "power": 15, "damage_type": "physical", "speed": 10, "crit_chance": 0.3}'),
('void_hammer', 'Void Hammer', 'So heavy it has its own gravitational pull.', 95000, 95000, 6, 1, '{"type": "weapon", "power": 50, "damage_type": "void", "speed": 1, "crit_chance": 0.05}'),
('hell_forged_axe', 'Hell-Forged Axe', 'Standard issue for demon warriors.', 60000, 60000, 6, 1, '{"type": "weapon", "power": 35, "damage_type": "fire", "speed": 4, "crit_chance": 0.1}');

-- It might be a good idea to nullify the old bonus columns for weapons
UPDATE items SET bonus_type = NULL, bonus_value = NULL WHERE category_id = 6;