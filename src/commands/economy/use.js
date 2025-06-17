const { getUser, updateUser, getUserItem, removeItemFromUser, getItemById, getAllCategories } = require('../../services/economyService');

module.exports = {
  name: 'use',
  description: 'Use a consumable item from your inventory.',
  slash: true,
  params: [
    {
      name: 'item_id',
      description: 'The ID of the item you want to use.',
      type: 3, // String
      required: true,
    },
  ],

  async execute(ctx, args) {
    const isSlash = !args;
    const author = isSlash ? ctx.user : ctx.author;
    const itemId = isSlash ? ctx.options.getString('item_id') : args[0];

    const reply = (content) => {
        const payload = { content, ephemeral: true };
        return isSlash ? ctx.reply(payload) : ctx.reply(content);
    };

    if (!itemId) {
      return reply('You need to provide the ID of the item you wish to use.');
    }

    const itemInInventory = getUserItem(author.id, itemId);
    if (!itemInInventory) {
        return reply(`You don't own the item with ID \`${itemId}\`.`);
    }

    const itemDetails = getItemById(itemId);
    const consumableCategory = getAllCategories().find(c => c.name === 'Drugs');

    if (!itemDetails || itemDetails.category_id !== consumableCategory?.id) {
        return reply(`The item \`${itemId}\` is not a usable item.`);
    }

    // --- Apply Item Effects ---
    let replyMessage = `You have used **${itemDetails.name}**.`;

    switch (itemDetails.bonus_type) {
        case 'work_cooldown_reset':
            updateUser(author.id, { lastWork: 0 });
            replyMessage += "\nYour work cooldown has been reset!";
            break;
        // NOTE: Future item effects like 'work_boost_temporary' would be handled here.
        default:
            return reply(`The item **${itemDetails.name}** doesn't have a use effect yet.`);
    }

    // Remove one item from inventory
    removeItemFromUser(author.id, itemId, 1);

    return reply(replyMessage);
  },
};