const { EmbedBuilder } = require('discord.js');
const { getRanks } = require('../../services/economyService');

module.exports = {
    name: 'ranks',
    description: 'Displays the list of all available ranks and their requirements.',
    slash: true,

    async execute(ctx) {
        const ranks = getRanks();
        const embed = new EmbedBuilder()
            .setTitle('🔥 Ranks of the Underworld 🔥')
            .setDescription('Ascend the hierarchy by increasing your net worth.')
            .setColor('#ff0000')
            .setTimestamp();

        ranks.forEach(rank => {
            embed.addFields({
                name: `${rank.name}`,
                value: `**Net Worth:** Ѫ ${rank.netWorth.toLocaleString()}`
            });
        });

        const isSlash = !ctx.author;
        return isSlash
            ? ctx.reply({ embeds: [embed] })
            : ctx.channel.send({ embeds: [embed] });
    }
};