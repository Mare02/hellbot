-- Migration 012: Add Armor and Armor Stats

-- Add 'Armor' category
INSERT INTO item_categories (id, name, description, emoji) VALUES
(8, 'Armor', 'Protective gear to keep your soul intact.', '🛡️');

-- Add new armor items with stats
INSERT INTO items (id, name, description, price, value, category_id, unique_item, stats) VALUES
('leather_armor', 'Basic Leather Armor', 'Simple, tough leather protection. Better than nothing.', 15000, 15000, 8, 1, '{"defense": 10}'),
('iron_plate', 'Iron Plating', 'Heavy iron plates that offer solid defense.', 40000, 40000, 8, 1, '{"defense": 25}'),
('hellfire_chainmail', 'Hellfire Chainmail', 'Chainmail forged in hellfire, offering a balance of protection and menace.', 75000, 75000, 8, 1, '{"defense": 40, "damage": 5}'),
('demonic_shield', 'Demonic Shield', 'A large shield adorned with a screaming demon face. It eats incoming projectiles for breakfast.', 120000, 120000, 8, 1, '{"defense": 60}'),
('soulforged_plate', 'Soul-Forged Plate Armor', 'Masterwork plate armor forged with captured souls. Provides immense protection.', 250000, 250000, 8, 1, '{"defense": 100, "damage": 10}'); 