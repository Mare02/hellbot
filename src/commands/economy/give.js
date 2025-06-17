const { getUser, updateUser } = require('../../services/economyService');

module.exports = {
  name: 'give',
  description: 'Give souls to another user.',
  slash: true,
  params: [
    {
      name: 'user',
      description: 'The user you want to give souls to.',
      type: 6, // USER type
      required: true,
    },
    {
        name: 'amount',
        description: 'The amount of souls to give.',
        type: 4, // Integer
        required: true,
    }
  ],

  async execute(ctx, args) {
    const isSlash = !args;
    const author = isSlash ? ctx.user : ctx.author;

    let targetUser;
    let amount;

    if (isSlash) {
        targetUser = ctx.options.getUser('user');
        amount = ctx.options.getInteger('amount');
    } else {
        targetUser = ctx.mentions.users.first();
        amount = parseInt(args[1], 10);
    }
    
    const reply = (content) => {
        const payload = { content, ephemeral: true };
        return isSlash ? ctx.reply(payload) : ctx.reply(content);
    };

    if (!targetUser) {
        return reply('You need to mention a user to give souls to.');
    }

    if (isNaN(amount) || amount <= 0) {
      return reply('Please provide a valid amount of souls to give.');
    }

    if (targetUser.id === author.id) {
        return reply("You can't give souls to yourself.");
    }

    if (targetUser.bot) {
        return reply("You can't give souls to a bot.");
    }

    const authorData = getUser(author.id);

    if (authorData.souls < amount) {
      return reply(`You don't have enough souls in your wallet. You only have **Ѫ ${authorData.souls.toLocaleString()}**.`);
    }

    // All checks passed, proceed with transfer
    const targetData = getUser(targetUser.id);

    const authorNewSouls = authorData.souls - amount;
    const targetNewSouls = targetData.souls + amount;

    // We only need to update souls, as net worth just moves from one user to another
    updateUser(author.id, { souls: authorNewSouls });
    updateUser(targetUser.id, { souls: targetNewSouls });

    const replyMessage = `You have successfully given **Ѫ ${amount.toLocaleString()}** to ${targetUser.username}.`;
    
    return isSlash
        ? ctx.reply(replyMessage)
        : ctx.channel.send(replyMessage);
  },
}; 