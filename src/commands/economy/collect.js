const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserInvestments, updateUserInvestments } = require('../../services/economyService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('collect')
        .setDescription('Collect earnings from your investments.'),
    slash: true,
    cooldown: 60, // Cooldown to prevent spamming the check
    async execute(ctx) {
        const author = ctx.user || ctx.author;
        const userInvestments = getUserInvestments(author.id);

        if (!userInvestments.length) {
            return ctx.reply({ content: "You don't own any investments. Use `/investments` to see what's available.", ephemeral: true });
        }

        const now = Date.now();
        let totalPayout = 0;
        const payoutDetails = [];
        const collectedInvestmentIds = [];
        const nextCollectionTimes = [];

        for (const investment of userInvestments) {
            const msSinceLastPayout = now - investment.last_payout_date;
            const hoursSinceLastPayout = msSinceLastPayout / (1000 * 60 * 60);

            if (hoursSinceLastPayout >= investment.payout_interval_hours) {
                const intervalsPassed = Math.floor(hoursSinceLastPayout / investment.payout_interval_hours);
                const payout = intervalsPassed * investment.payout_amount;
                totalPayout += payout;
                payoutDetails.push({ name: investment.name, amount: payout });
                collectedInvestmentIds.push(investment.id);
            } else {
                const nextPayoutDate = investment.last_payout_date + (investment.payout_interval_hours * 3600000);
                nextCollectionTimes.push(nextPayoutDate);
            }
        }

        if (totalPayout === 0) {
            if (nextCollectionTimes.length > 0) {
                const soonestTime = Math.min(...nextCollectionTimes);
                const soonestTimestamp = Math.floor(soonestTime / 1000);
                return ctx.reply({ content: `It's too soon to collect. Your next collection is available <t:${soonestTimestamp}:R>.`, ephemeral: true });
            }
            return ctx.reply({ content: "It's too soon to collect. Check back later.", ephemeral: true });
        }

        updateUserInvestments(author.id, totalPayout, collectedInvestmentIds);

        const embed = new EmbedBuilder()
            .setTitle('💰 Earnings Collected! 💰')
            .setColor('#ffd700')
            .setDescription(`You have successfully collected a total of **Ѫ ${totalPayout.toLocaleString()}**!`)
            .setTimestamp();

        payoutDetails.forEach(detail => {
            embed.addFields({ name: detail.name, value: `Collected **Ѫ ${detail.amount.toLocaleString()}**` });
        });

        const isSlash = !ctx.author;
        return isSlash
            ? ctx.reply({ embeds: [embed] })
            : ctx.channel.send({ embeds: [embed] });
    },
};