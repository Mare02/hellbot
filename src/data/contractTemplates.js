const contractTemplates = [
    {
        name: "Lost Delivery Retrieval",
        description: "A merchant's cargo was ambushed by bandits. Retrieve the stolen goods. It's a risky job, but the pay is decent.",
        rewardRange: [100, 250],
        requirements: {
            min_rank: "Thug",
            min_damage: 10,
            target_damage: 15,
            target_defense: 8,
        },
    },
    {
        name: "Vermin Extermination",
        description: "A local farm is overrun by giant rats. Clear them out before they devour the entire harvest. Simple, but messy work.",
        rewardRange: [50, 150],
        requirements: {},
    },
    {
        name: "Protect the Caravan",
        description: "Guard a valuable caravan as it travels through a dangerous mountain pass known for its territorial beasts.",
        rewardRange: [300, 500],
        requirements: {
            min_rank: "Executioner",
            min_damage: 30,
            min_armor_defense: 20,
            target_damage: 40,
            target_defense: 25,
        },
    },
    {
        name: "Heist the Citadel",
        description: "An infamous crime lord wants you to infiltrate a corrupt noble's fortress and 'liberate' a priceless artifact. High risk, high reward.",
        rewardRange: [1000, 2500],
        requirements: {
            min_rank: "Thug",
            min_damage: 100,
            min_armor_defense: 80,
            target_damage: 120,
            target_defense: 90,
        },
    },
    {
        name: "Goblin Raid",
        description: "A group of goblins has been terrorizing a nearby village. Eliminate the threat and bring peace to the villagers.",
        rewardRange: [200, 400],
        requirements: {
            min_rank: "Goblin",
            min_damage: 20,
            target_damage: 25,
            target_defense: 15,
        },
    },
    {
        name: "Impish Mischief",
        description: "Mischievous imps have been causing chaos in the marketplace. Capture them before they cause more trouble.",
        rewardRange: [50, 100],
        requirements: {
            min_rank: "Imp",
            target_damage: 8,
            target_defense: 5,
        },
    },
    {
        name: "Ancient Ruins Artifact",
        description: "The Overlord demands a rare artifact from the depths of the ancient ruins. Retrieve it and earn his favor.",
        rewardRange: [1500, 3000],
        requirements: {
            min_rank: "Overlord",
            min_damage: 150,
            min_armor_defense: 100,
            target_damage: 180,
            target_defense: 120,
        },
    },
    {
        name: "Rival Demon Duel",
        description: "Prove your worth to the Demon Lord by defeating a rival demon in a duel. Only the strongest will survive.",
        rewardRange: [3000, 5000],
        requirements: {
            min_rank: "Demon Lord",
            min_damage: 200,
            min_armor_defense: 150,
            target_damage: 250,
            target_defense: 180,
        },
    },
    {
        name: "Guard the Execution",
        description: "A notorious bandit leader has been captured. Ensure his execution goes smoothly without any interference.",
        rewardRange: [500, 800],
        requirements: {
            min_rank: "Executioner",
            min_damage: 50,
            min_armor_defense: 40,
            target_damage: 60,
            target_defense: 45,
        },
    },
    {
        name: "Magical Artifact Retrieval",
        description: "A mischievous imp has stolen a magical artifact from the local wizard. Retrieve it before the imp causes more chaos.",
        rewardRange: [80, 150],
        requirements: {
            min_rank: "Imp",
            target_damage: 12,
            target_defense: 8,
        },
    },
    {
        name: "Secure the Hidden Gold",
        description: "A goblin has discovered a hidden stash of gold. Secure it before rival goblins claim it for themselves.",
        rewardRange: [250, 450],
        requirements: {
            min_rank: "Goblin",
            min_damage: 25,
            target_damage: 30,
            target_defense: 18,
        },
    },
    {
        name: "Fugitive Bounty",
        description: "A notorious thug is on the run. Capture him and bring him to justice for a handsome reward.",
        rewardRange: [400, 600],
        requirements: {
            min_rank: "Thug",
            min_damage: 40,
            target_damage: 50,
            target_defense: 30,
        },
    },
    {
        name: "Countryside Beast Hunt",
        description: "A dangerous beast is terrorizing the countryside. Track it down and eliminate the threat.",
        rewardRange: [600, 900],
        requirements: {
            min_rank: "Executioner",
            min_damage: 60,
            min_armor_defense: 50,
            target_damage: 75,
            target_defense: 60,
        },
    },
    {
        name: "Fortress Siege",
        description: "Lead an assault on a fortified enemy stronghold. Victory will bring great honor and reward.",
        rewardRange: [2000, 3500],
        requirements: {
            min_rank: "Overlord",
            min_damage: 180,
            min_armor_defense: 120,
            target_damage: 220,
            target_defense: 150,
        },
    },
    {
        name: "Faction Annihilation",
        description: "Unleash the Demon Lord's wrath upon a rival faction. Only the most powerful can undertake this mission.",
        rewardRange: [4000, 6000],
        requirements: {
            min_rank: "Demon Lord",
            min_damage: 250,
            min_armor_defense: 200,
            target_damage: 300,
            target_defense: 240,
        },
    },
];

module.exports = {
    contractTemplates,
};