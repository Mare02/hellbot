const { deleteAllContracts } = require('../../services/economyService');
const { owner } = require('../../utils/config');

module.exports = {
    name: 'deletecontracts',
    description: 'Deletes all contracts from the system. (Admin only)',
    async execute(message, args) {
        if (message.author.id !== owner.id) {
            return message.reply("You don't have permission to use this command.");
        }

        try {
            await message.channel.send('Deleting all contracts... ⏳');
            const result = deleteAllContracts();
            const deletedCount = result.changes || 0;
            
            if (deletedCount === 0) {
                await message.channel.send('✅ No contracts were found to delete. The system is already clean.');
            } else {
                await message.channel.send(`✅ Successfully deleted ${deletedCount} contract(s) from the system.`);
            }
        } catch (error) {
            console.error("Failed to delete contracts:", error);
            await message.channel.send("❌ An error occurred while deleting contracts. Please check the logs.");
        }
    },
}; 