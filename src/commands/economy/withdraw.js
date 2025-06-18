const { getUser, updateUser, updateUserRank } = require('../../services/economyService');

module.exports = {
  name: 'withdraw',
  description: 'Withdraw your souls from the bank.',
  slash: true,
  params: [
    {
      name: 'amount',
      description: 'The amount to withdraw (or "all").',
      type: 3, // String type to allow for "all"
      required: true,
    },
  ],

  async execute(ctx, args) {
    const isSlash = !args;
    const author = isSlash ? ctx.user : ctx.author;
    const client = isSlash ? ctx.client : ctx.channel.client;
    const amountStr = isSlash ? ctx.options.getString('amount') : args[0];

    if (!amountStr) {
      const replyContent = 'Please provide an amount to withdraw (e.g., `!withdraw 100` or `!withdraw all`).';
      return isSlash ? ctx.reply({ content: replyContent, ephemeral: true }) : ctx.reply(replyContent);
    }

    const userData = getUser(author.id);
    let amountToWithdraw;

    if (amountStr.toLowerCase() === 'all') {
      amountToWithdraw = userData.bank;
    } else {
      amountToWithdraw = parseInt(amountStr, 10);
    }

    if (isNaN(amountToWithdraw) || amountToWithdraw <= 0) {
      const replyContent = 'Please provide a valid amount to withdraw.';
      return isSlash ? ctx.reply({ content: replyContent, ephemeral: true }) : ctx.reply(replyContent);
    }

    if (amountToWithdraw > userData.bank) {
      const replyContent = "You can't withdraw more souls than you have in your bank.";
      return isSlash ? ctx.reply({ content: replyContent, ephemeral: true }) : ctx.reply(replyContent);
    }

    const newSouls = userData.souls + amountToWithdraw;
    const newBank = userData.bank - amountToWithdraw;

    updateUser(author.id, {
      souls: newSouls,
      bank: newBank,
    });

    updateUserRank(author.id, client);

    const replyContent = `You have successfully withdrawn **Ѫ ${amountToWithdraw.toLocaleString()}** from your bank.`;
    if (isSlash) {
        await ctx.reply({ content: replyContent, ephemeral: true });
    } else {
        await ctx.reply(replyContent);
    }
  },
};