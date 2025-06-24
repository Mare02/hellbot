const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getInvestments, getUser, getUserInvestments, buyInvestment } = require('../../services/economyService');

module.exports = {
    name: 'investments',
    description: 'View and purchase available investments.',
    slash: true,
    cooldown: 10,
    async execute(ctx) {
        const investments = getInvestments();
        const author = ctx.user || ctx.author;

        if (!investments.length) {
            return ctx.reply({ content: 'There are currently no investments available. The overlords are stingy today.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('Infernal Investments')
            .setDescription('Here are the available assets to grow your fortune. Use the dropdown to purchase an investment.')
            .setColor('#ff0000')
            .setTimestamp();

        investments.forEach(inv => {
            embed.addFields({
                name: `${inv.name} - Ѫ ${inv.cost.toLocaleString()}`,
                value: `*${inv.description}*\n**Payout:** Ѫ ${inv.payout_amount.toLocaleString()} every ${inv.payout_interval_hours} hours.`,
            });
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('buy_investment_select')
            .setPlaceholder('Select an investment to purchase...')
            .addOptions(investments.map(inv => ({
                label: inv.name,
                description: `Cost: Ѫ ${inv.cost.toLocaleString()}`,
                value: inv.id.toString(),
            })));

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const message = await ctx.reply({ embeds: [embed], components: [row], fetchReply: true });

        const collector = message.createMessageComponentCollector({
            filter: i => i.user.id === author.id,
            time: 120000,
        });

        collector.on('collect', async i => {
            if (i.customId === 'buy_investment_select') {
                await i.deferUpdate();
                const investmentId = parseInt(i.values[0], 10);
                const investment = investments.find(inv => inv.id === investmentId);

                if (!investment) {
                    await i.followUp({ content: 'This investment could not be found.', ephemeral: true });
                    return;
                }

                const userInvestments = getUserInvestments(author.id);
                if (userInvestments.some(ui => ui.investment_id === investment.id)) {
                    await i.followUp({ content: `You already own a ${investment.name}. You can only have one of each type.`, ephemeral: true });
                    return;
                }

                const user = getUser(author.id);
                if (user.souls < investment.cost) {
                    await i.followUp({ content: `You need **Ѫ ${investment.cost.toLocaleString()}** to buy a ${investment.name}, but you only have **Ѫ ${user.souls.toLocaleString()}**.`, ephemeral: true });
                    return;
                }

                const result = buyInvestment(author.id, investment.id, investment.cost);

                if (result.success) {
                    await i.followUp({ content: `Congratulations! You have successfully purchased a **${investment.name}**. Use \`/collect\` to claim your earnings.`, ephemeral: true });
                } else {
                    await i.followUp({ content: `The transaction failed. Reason: ${result.message}`, ephemeral: true });
                }
            }
        });

        collector.on('end', () => {
            message.edit({ components: [] }).catch(() => {});
        });
    },
};