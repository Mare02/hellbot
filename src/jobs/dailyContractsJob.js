const economyService = require('../services/economyService');
const { contractTemplates } = require('../data/contractTemplates');
const { getRandomElement, getRandomInt } = require('../utils/helpers');
const cron = require('node-cron');

const NUMBER_OF_CONTRACTS_PER_DAY = 5;

async function generateDailyContracts() {
    console.log('Running daily contracts job...');

    // Wrap the entire process in a transaction
    const runContractJob = economyService.db.transaction(() => {
        try {
            // 1. Clean up expired contracts from the previous day
            const deletedCount = economyService.deleteExpiredContracts();
            if (deletedCount > 0) {
                console.log(`Cleaned up ${deletedCount} expired contracts.`);
            }

            // 2. Generate new contracts for the day
            let generatedCount = 0;
            for (let i = 0; i < NUMBER_OF_CONTRACTS_PER_DAY; i++) {
                const template = getRandomElement(contractTemplates);
                if (!template) continue;

                // Generate a random reward within the template's range
                const reward = getRandomInt(template.rewardRange[0], template.rewardRange[1]);

                // Set the expiration date to 24 hours from now
                const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

                // --- Generate Target Stats ---
                const requirements = { ...template.requirements };

                // Only generate target stats if the contract has actual requirements
                const hasRequirements = requirements.min_damage || requirements.min_armor_defense;

                if (hasRequirements) {
                    // Base difficulty is calculated from the minimum damage and defense required for the contract.
                    const baseDifficulty = (requirements.min_damage || 5) + (requirements.min_armor_defense || 0);

                    // Target defense is primarily based on the damage required.
                    requirements.target_defense = Math.floor(baseDifficulty * (getRandomInt(10, 15) / 10)); // 1.0x to 1.5x

                    // Target damage is primarily based on the armor required, but with a base value.
                    requirements.target_damage = Math.floor((requirements.min_armor_defense || 5) * (getRandomInt(5, 10) / 10)); // 0.5x to 1.0x
                }

                const newContract = {
                    name: template.name,
                    description: template.description,
                    reward: reward,
                    requirements: requirements,
                    expires_at: expires_at,
                };

                economyService.createContract(newContract);
                generatedCount++;
            }
            console.log(`Successfully generated ${generatedCount} new contracts.`);
            return generatedCount;
        } catch (error) {
            console.error('Error during daily contracts job, rolling back transaction.', error);
            // Manually throw to trigger the rollback
            throw error;
        }
    });

    try {
        return runContractJob();
    } catch (error) {
        // The error is already logged inside the transaction.
        // This catch block prevents the main application from crashing.
        console.error('The daily contracts job failed and was rolled back.');
        return 0; // Indicate failure
    }
}

const dailyContractsJob = {
    schedule: () => {
        // Schedule to run every day at midnight
        cron.schedule('0 0 * * *', generateDailyContracts);
    }
};

module.exports = {
    dailyContractsJob,
    generateDailyContracts,
};