const { EmbedBuilder } = require('discord.js');
const { getUser, getUserInventory, getItemById, getUserTotalStats, getUserNetWorth, getRanks, getUserInvestments } = require('../../services/economyService');

module.exports = {
  name: 'profile',
  description: "Displays your or another user's economy profile.",
  slash: true,
  params: [
    {
      name: 'user',
      description: 'The user whose profile you want to see.',
      type: 6, // 6 is for USER type
      required: false,
    },
  ],
  async execute(ctx, args) {
    const isSlash = !args;
    let targetUser;

    if (isSlash) {
        targetUser = ctx.options.getUser('user') || ctx.user;
    } else {
        targetUser = ctx.mentions.users.first() || ctx.author;
    }
    const userData = getUser(targetUser.id);
    const userInventory = getUserInventory(targetUser.id);
    const userDamage = getUserTotalStats(targetUser.id, 'damage');
    const userDefense = getUserTotalStats(targetUser.id, 'defense');
    const userInvestments = getUserInvestments(targetUser.id);

    const netWorth = getUserNetWorth(targetUser.id);

    const ranks = getRanks();
    const userRankInfo = ranks.find(r => r.name === userData.rank);
    const rankDisplay = userRankInfo ? `${userRankInfo.name}` : userData.rank;

    const embed = new EmbedBuilder()
      .setTitle(`${targetUser.username}'s Infernal Profile`)
      .setColor('#ff0000')
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: '💰 Souls', value: `Ѫ ${userData.souls.toLocaleString()}`, inline: true },
        { name: '🏦 Bank', value: `Ѫ ${userData.bank.toLocaleString()}`, inline: true },
        { name: '💼 Net Worth', value: `Ѫ ${netWorth.totalNetWorth.toLocaleString()}`, inline: true },
        { name: '⚔️ Combat Stats', value: `**Damage:** ${userDamage} 🗡️\n**Defense:** ${userDefense} 🛡️`, inline: false },
        { name: '🏆 Rank', value: rankDisplay, inline: false },
      );

    if (userInvestments.length > 0) {
      const investmentString = userInvestments
        .map(inv => `• ${inv.name}`)
        .join('\n');
      embed.addFields({ name: '📈 Investments', value: investmentString, inline: false });
    }

    if (userInventory.length > 0) {
        const fullInventory = userInventory
            .map(invItem => ({ ...getItemById(invItem.itemId), quantity: invItem.quantity }))
            .filter(item => item.id); // Filter out any potentially missing items

        // Sort by total value (item.value * quantity) and take top 3
        const sortedInventory = fullInventory.sort((a, b) => (b.value * b.quantity) - (a.value * a.quantity));
        const topItems = sortedInventory.slice(0, 3);

        const inventoryString = topItems
            .map(item => `${item.name}${item.quantity > 1 ? ` (x${item.quantity})` : ''}`)
            .join('\n');

        if (inventoryString) {
            embed.addFields({ name: '💎 Prized Possessions', value: inventoryString, inline: false });
        }
    }

    embed
      .setFooter({ text: 'Hellbot Economy' })
      .setTimestamp();

    return isSlash ? ctx.reply({ embeds: [embed], ephemeral: true }) : ctx.reply({ embeds: [embed] });
  },
};