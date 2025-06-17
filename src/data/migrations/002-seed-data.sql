-- Migration 002: Seed Initial Data
-- This migration should only run once. The migration runner in the application logic will handle this.

-- Seed Categories
INSERT INTO item_categories (id, name, description) VALUES
(1, 'Tools', 'Items that provide a functional advantage.'),
(2, 'Cars', 'Luxury vehicles to show off your wealth.'),
(3, 'Jewelry', 'Flashy adornments to boost your status.'),
(4, 'Drugs', 'Illicit consumables with temporary effects.'),
(5, 'Collectibles', 'Rare and unique items for the discerning connoisseur.'),
(6, 'Weapons', 'Tools of destruction for the aspiring warlord.'),
(7, 'Property', 'Virtual real estate for the truly wealthy.');

-- Seed Items
INSERT INTO items (id, name, description, price, value, category_id, bonus_type, bonus_value, unique_item) VALUES
-- Tools
('pitchfork_rusty', 'Rusty Pitchfork', 'A basic, tetanus-inducing tool.', 2500, 2500, 1, 'work_multiplier', 0.05, 1),
('pitchfork_enchanted', 'Enchanted Pitchfork', 'Glows with a faint, malevolent energy.', 15000, 15000, 1, 'work_multiplier', 0.15, 1),
('soul_harvester', 'Soul Harvester 3000', 'The latest in soul-reaping technology. Fully automated.', 75000, 75000, 1, 'work_multiplier', 0.30, 1),
('infernal_shovel', 'Infernal Digging Shovel', 'Digs through earth, rock, and existential dread with ease.', 8000, 8000, 1, 'work_multiplier', 0.08, 1),
('demon_wrench', 'Demon-forged Wrench', 'Tightens bolts and loosens morals with equal efficiency.', 12000, 12000, 1, 'work_multiplier', 0.12, 1),
('soul_hammer', 'Soul-powered Hammer', 'Each strike is powered by the anguish of the damned.', 20000, 20000, 1, 'work_multiplier', 0.18, 1),
('hellfire_drill', 'Hellfire Power Drill', 'Drills through any material while screaming in ancient tongues.', 35000, 35000, 1, 'work_multiplier', 0.25, 1),
('cursed_chainsaw', 'Cursed Chainsaw of Efficiency', 'Cuts through work faster than it cuts through... other things.', 55000, 55000, 1, 'work_multiplier', 0.35, 1),
-- Cars
('hellfire_sedan', 'Hellfire Sedan', 'A reliable, four-door family car for the damned.', 100000, 100000, 2, NULL, NULL, 1),
('brimstone_coupe', 'Brimstone Coupe', 'A sleek, two-door sports car that screams "I have disposable souls."', 500000, 500000, 2, NULL, NULL, 1),
('behemoth_suv', 'Behemoth SUV', 'An obnoxiously large vehicle for hauling all your ill-gotten gains.', 850000, 850000, 2, NULL, NULL, 1),
('lucifers_chariot', 'Lucifer''s Chariot', 'A one-of-a-kind demonic supercar. The ultimate flex.', 2500000, 2500000, 2, NULL, NULL, 1),
-- Jewelry
('gold_chain', 'Gold Soul-Chain', 'A thick, heavy chain made of solidified, screaming souls.', 25000, 25000, 3, NULL, NULL, 0),
('damned_diamond_ring', 'Damned Diamond Ring', 'A ring with a diamond so large, its gravity pulls in nearby light.', 120000, 120000, 3, NULL, NULL, 0),
('crown_of_torment', 'Crown of Torment', 'A crown that whispers insults to all who stand near you.', 750000, 750000, 3, NULL, NULL, 1),
('hellfire_earrings', 'Hellfire Drop Earrings', 'Earrings that literally burn with the fires of damnation.', 45000, 45000, 3, NULL, NULL, 0),
('soul_pearl_necklace', 'Soul Pearl Necklace', 'Each pearl contains the essence of a particularly vain soul.', 80000, 80000, 3, NULL, NULL, 0),
('brimstone_bracelet', 'Brimstone Power Bracelet', 'A bracelet that pulses with dark energy and smells of sulfur.', 35000, 35000, 3, NULL, NULL, 0),
('demon_cufflinks', 'Demon-carved Cufflinks', 'Tiny demon faces that scowl disapprovingly at formal events.', 15000, 15000, 3, NULL, NULL, 0),
('cursed_tiara', 'Cursed Diamond Tiara', 'Makes you feel royal while slowly draining your sanity.', 200000, 200000, 3, NULL, NULL, 1),
('blood_ruby_pendant', 'Blood Ruby Pendant', 'A pendant that glows red and whispers sweet nothings about violence.', 95000, 95000, 3, NULL, NULL, 0),
('nightmare_watch', 'Nightmare Pocket Watch', 'Tells time in multiple dimensions, none of them good.', 150000, 150000, 3, NULL, NULL, 1),
-- Drugs
('cooldown_cocaine', 'Cooldown Cocaine', 'A bump of pure infernal energy that resets your work cooldown.', 1000, 0, 4, 'work_cooldown_reset', NULL, 0),
('rage_pills', 'Rage Pills', 'Temporarily doubles your work output, but with a chance of backfire.', 5000, 0, 4, 'work_boost_temporary', 2, 0),
('soul_stimulant', 'Soul Stimulant Injection', 'Injects liquid motivation directly into your spiritual essence.', 2500, 0, 4, 'work_boost_temporary', 1.5, 0),
('demon_energy_drink', 'Demon Energy Drink', 'Contains 666mg of caffeine and questionable mystical ingredients.', 800, 0, 4, 'work_cooldown_reduction', 0.25, 0),
('hellish_herbs', 'Hellish Herb Blend', 'Smokable herbs that enhance focus and induce mild hallucinations.', 1500, 0, 4, 'work_multiplier_temporary', 0.20, 0),
('brimstone_powder', 'Brimstone Performance Powder', 'A mysterious powder that makes everything seem possible... for a while.', 3500, 0, 4, 'work_boost_temporary', 3, 0),
('liquid_motivation', 'Liquid Motivation Serum', 'A vial of pure ambition in liquid form. Side effects may include megalomania.', 7500, 0, 4, 'work_multiplier_temporary', 0.50, 0),
('infernal_adrenaline', 'Infernal Adrenaline Shot', 'Adrenaline harvested from demons mid-rampage. Use sparingly.', 4500, 0, 4, 'work_cooldown_reset', NULL, 0),
('soul_sedative', 'Soul Sedative Tablets', 'Calms the most agitated spirits... and everything else.', 1200, 0, 4, 'stress_reduction', 50, 0),
-- Collectibles
('screaming_skull', 'Screaming Skull', 'An ornate skull that screams when you shake it.', 5000, 5000, 5, NULL, NULL, 0),
('cursed_mirror', 'Cursed Mirror', 'A mirror that shows a horrifyingly twisted version of your reflection.', 15000, 15000, 5, NULL, NULL, 1),
('devils_contract', 'Devil''s Contract', 'A signed, binding contract from a lesser devil. A collector''s piece.', 80000, 80000, 5, NULL, NULL, 1),
('demon_snow_globe', 'Demon Snow Globe', 'A snow globe filled with ash and tiny screaming figures.', 12000, 12000, 5, NULL, NULL, 0),
('soul_jar', 'Vintage Soul Preservation Jar', 'An antique jar containing what appears to be a very angry soul.', 25000, 25000, 5, NULL, NULL, 0),
('hellhound_statue', 'Hellhound Figurine', 'A detailed sculpture that occasionally growls when no one''s looking.', 18000, 18000, 5, NULL, NULL, 0),
('torture_device_miniature', 'Miniature Torture Device Set', 'Collectible replicas of history''s most creative torture devices.', 35000, 35000, 5, NULL, NULL, 1),
('damned_painting', 'Portrait of the Damned', 'A painting whose eyes follow you around the room... menacingly.', 65000, 65000, 5, NULL, NULL, 1),
('bone_chess_set', 'Human Bone Chess Set', 'A complete chess set carved from the bones of former chess champions.', 45000, 45000, 5, NULL, NULL, 1),
('music_box_screams', 'Music Box of Eternal Screams', 'Plays a hauntingly beautiful melody accompanied by background screaming.', 28000, 28000, 5, NULL, NULL, 1),
('demon_cookbook', 'Ancient Demon Cookbook', 'Contains recipes for dishes made from ingredients you don''t want to know about.', 22000, 22000, 5, NULL, NULL, 1),
('soul_crystal', 'Crystallized Soul Fragment', 'A beautiful crystal formation that pulses with trapped spiritual energy.', 40000, 40000, 5, NULL, NULL, 0),
-- Weapons
('hellfire_sword', 'Hellfire Longsword', 'A sword that burns with the fires of damnation.', 50000, 50000, 6, 'combat_power', 25, 1),
('soul_reaper_scythe', 'Soul Reaper''s Scythe', 'The traditional tool of death, now available in retail.', 85000, 85000, 6, 'combat_power', 40, 1),
('demon_crossbow', 'Demon-forged Crossbow', 'Shoots bolts of pure malice with pinpoint accuracy.', 65000, 65000, 6, 'combat_power', 30, 1),
('torture_whip', 'Whip of Endless Torture', 'Each crack sounds like a symphony of suffering.', 35000, 35000, 6, 'combat_power', 20, 1),
('brimstone_mace', 'Brimstone War Mace', 'A heavy mace that crushes hope along with bones.', 45000, 45000, 6, 'combat_power', 22, 1),
-- Property
('torture_chamber', 'Personal Torture Chamber', 'Your own private space for creative interrogation techniques.', 500000, 500000, 7, NULL, NULL, 1),
('soul_processing_plant', 'Soul Processing Facility', 'An industrial complex for mass soul refinement operations.', 2000000, 2000000, 7, NULL, NULL, 1),
('demon_nightclub', 'Exclusive Demon Nightclub', 'Where the elite demons go to see and be seen.', 1500000, 1500000, 7, NULL, NULL, 1),
('hellish_mansion', 'Hellish Mansion Estate', 'A sprawling mansion with 66 rooms of pure evil luxury.', 3500000, 3500000, 7, NULL, NULL, 1),
('lava_spa', 'Luxury Lava Spa Resort', 'The ultimate relaxation destination in the depths of hell.', 1200000, 1200000, 7, NULL, NULL, 1); 