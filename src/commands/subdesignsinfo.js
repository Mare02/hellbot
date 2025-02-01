const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'subdesignsinfo',
    description: 'Shows Subscriber Designs participants.',
    slash: true,
    async execute(message) {
        const reply = await message.reply('Fetching Subscriber Designs participants...');

        try {
            const members = await message.guild.members.fetch();
            const participants = members.filter(member =>
                member.roles.cache.has('1333071192994877522')
            );

            if (participants.length === 0) {
                await reply.edit('No Subscriber Designs participants found.');
                return;
            }

            let response = `**Subscriber Designs Participants:**\n`;

            participants.forEach(member => {
                response += `- ${member.user.username} (${member.user.id})\n`;
            });

            await reply.edit(response);

        } catch (error) {
            console.error('Error in subdesignsinfo command:', error);
            await reply.edit('An error occurred while fetching Subscriber Designs participants.');
        }
    },
};
