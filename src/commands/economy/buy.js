const { getUser, updateUser, addItemToUser, getUserItem, getItemById, updateUserRank } = require('../../services/economyService');

module.exports = {
  name: 'buy',
  description: 'Buy an item from the shop.',
  slash: true,
  params: [
    {
      name: 'item_id',
      description: 'The ID of the item you want to purchase.',
      type: 3, // String
      required: true,
    },
    {
        name: 'quantity',
        description: 'The amount you want to buy (defaults to 1).',
        type: 4, // Integer
        required: false,
    }
  ],

  async execute(ctx, args) {
    const isSlash = !args;
    const author = isSlash ? ctx.user : ctx.author;
    const client = isSlash ? ctx.client : ctx.channel.client;
    const itemId = isSlash ? ctx.options.getString('item_id') : args[0];
    const quantity = isSlash ? ctx.options.getInteger('quantity') || 1 : parseInt(args[1] || '1', 10);

    const reply = (content) => {
        const payload = { content, ephemeral: true };
        return isSlash ? ctx.reply(payload) : ctx.reply(content);
    };

    if (!itemId) {
      return reply('You need to provide the ID of the item you wish to buy. You can find IDs in the `/shop`.');
    }

    if (isNaN(quantity) || quantity < 1) {
        return reply('Please provide a valid quantity.');
    }

    const itemToBuy = getItemById(itemId);

    if (!itemToBuy) {
      return reply(`The item with ID \`${itemId}\` does not exist.`);
    }

    const userData = getUser(author.id);
    const totalCost = itemToBuy.price * quantity;

    if (userData.souls < totalCost) {
      return reply(`You don't have enough souls. You need **Ѫ ${totalCost.toLocaleString()}** but you only have **Ѫ ${userData.souls.toLocaleString()}**.`);
    }

    if (itemToBuy.unique_item) {
        if (quantity > 1) {
            return reply(`You can only own one **${itemToBuy.name}** at a time.`);
        }
        const userItem = getUserItem(author.id, itemToBuy.id);
        if (userItem) {
            return reply(`You already own a **${itemToBuy.name}**.`);
        }
    }

    // All checks passed, proceed with purchase
    const newSouls = userData.souls - totalCost;

    updateUser(author.id, { souls: newSouls });
    addItemToUser(author.id, itemToBuy.id, quantity);
    updateUserRank(author.id, client);

    return reply(`You have successfully purchased **${quantity}x ${itemToBuy.name}** for **Ѫ ${totalCost.toLocaleString()}**!`);
  },
};