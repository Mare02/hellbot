const { EmbedBuilder } = require('discord.js');
const { getUser, getUserInventory, getItemById } = require('../../services/economyService');

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

    // --- Dynamic Net Worth Calculation ---
    const itemsValue = userInventory.reduce((total, invItem) => {
        const itemDetails = getItemById(invItem.itemId);
        // Ensure item exists and has value before adding
        return total + (itemDetails?.value || 0) * invItem.quantity;
    }, 0);
    const netWorth = userData.souls + userData.bank + itemsValue;
    // --- End Dynamic Net Worth Calculation ---

    const embed = new EmbedBuilder()
      .setTitle(`${targetUser.username}'s Infernal Profile`)
      .setColor('#ff0000')
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: '💰 Souls', value: `Ѫ ${userData.souls.toLocaleString()}`, inline: true },
        { name: '🏦 Bank', value: `Ѫ ${userData.bank.toLocaleString()}`, inline: true },
        { name: '💼 Net Worth', value: `Ѫ ${netWorth.toLocaleString()}`, inline: true },
        { name: '🏆 Rank', value: userData.rank, inline: false },
      );

    // --- Inventory Showcase ---
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
    // --- End Inventory Showcase ---

    embed
      .setFooter({ text: 'Hellbot Economy' })
      .setTimestamp();

    return isSlash ? ctx.reply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] });
  },
}; 