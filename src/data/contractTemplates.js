// This file contains templates for generating contracts.
// Each template defines the structure for a contract, including ranges for rewards
// and potential requirements, allowing for dynamic and varied contract generation.

const contractTemplates = [
    {
        name: "Lost Delivery Retrieval",
        description: "A merchant's cargo was ambushed by bandits. Retrieve the stolen goods. It's a risky job, but the pay is decent.",
        rewardRange: [100, 250],
        requirements: {
            min_rank: "Thug", // Example rank
            min_damage: 10,
        },
    },
    {
        name: "Vermin Extermination",
        description: "A local farm is overrun by giant rats. Clear them out before they devour the entire harvest. Simple, but messy work.",
        rewardRange: [50, 150],
        requirements: {
            // No special requirements, good for new players
        },
    },
    {
        name: "Protect the Caravan",
        description: "Guard a valuable caravan as it travels through a dangerous mountain pass known for its territorial beasts.",
        rewardRange: [300, 500],
        requirements: {
            min_rank: "Executioner", // Example of a higher rank
            min_damage: 30,
            min_armor_defense: 20,
        },
    },
    {
        name: "Heist the Citadel",
        description: "An infamous crime lord wants you to infiltrate a corrupt noble's fortress and 'liberate' a priceless artifact. High risk, high reward.",
        rewardRange: [1000, 2500],
        requirements: {
            min_rank: "Mastermind", // Example of a very high rank
            min_damage: 100,
            min_armor_defense: 80,
        },
    },
];

module.exports = {
    contractTemplates,
};