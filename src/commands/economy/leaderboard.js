const { EmbedBuilder } = require('discord.js');
const { getAllUsers, getUserNetWorth } = require('../../services/economyService');

module.exports = {
    name: 'leaderboard',
    description: 'Displays the top 10 richest users on the server.',
    slash: true,

    async execute(ctx) {
        const allUsers = getAllUsers();
        if (!allUsers || allUsers.length === 0) {
            return ctx.reply({ content: 'There are no users to rank yet.', ephemeral: true });
        }

        const rankedUsers = allUsers.map(user => {
            const netWorth = getUserNetWorth(user.userId);
            return {
                userId: user.userId,
                netWorth,
            };
        });

        rankedUsers.sort((a, b) => b.netWorth - a.netWorth);

        const top10 = rankedUsers.slice(0, 10);

        const embed = new EmbedBuilder()
            .setTitle('Wealthiest Souls in Hell')
            .setColor('#ff0000')
            .setTimestamp();

        let description = '';
        for (let i = 0; i < top10.length; i++) {
            const user = await ctx.client.users.fetch(top10[i].userId).catch(() => null);
            const rank = i + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
            const userName = user ? user.username : 'Unknown User';
            const userData = top10[i];
            description += `${medal} **${userName}** - Ѫ ${userData.netWorth.totalNetWorth.toLocaleString()}\n`;
        }

        if (description === '') {
            description = 'No users with any wealth yet.';
        }

        embed.setDescription(description);

        const isSlash = !ctx.author;
        return isSlash
            ? ctx.reply({ embeds: [embed] })
            : ctx.channel.send({ embeds: [embed] });
    }
};