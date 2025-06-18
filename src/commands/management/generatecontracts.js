const { generateDailyContracts } = require('../../jobs/dailyContractsJob');
const { owner } = require('../../utils/config');

module.exports = {
    name: 'generatecontracts',
    description: 'Manually generates a new set of daily contracts. (Admin only)',
    async execute(message, args) {
        if (message.author.id !== owner.id) {
            return message.reply("You don't have permission to use this command.");
        }

        try {
            await message.channel.send('Force-generating new daily contracts... ⏳');
            const count = await generateDailyContracts();
            await message.channel.send(`✅ Successfully generated ${count} new contracts. They are now available.`);
        } catch (error) {
            console.error("Failed to manually generate contracts:", error);
            await message.channel.send("❌ An error occurred while generating contracts. Please check the logs.");
        }
    },
};