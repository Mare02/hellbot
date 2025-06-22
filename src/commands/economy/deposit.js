const { getUser, updateUser, updateUserRank } = require('../../services/economyService');

module.exports = {
  name: 'deposit',
  description: 'Deposit your souls into the bank to keep them safe.',
  slash: true,
  params: [
    {
      name: 'amount',
      description: 'The amount to deposit (or "all").',
      type: 3, // String type to allow for "all"
      required: true,
    },
  ],

  async execute(ctx, args) {
    const isSlash = !args;
    const author = isSlash ? ctx.user : ctx.author;
    const amountStr = isSlash ? ctx.options.getString('amount') : args[0];

    if (!amountStr) {
      const replyContent = 'Please provide an amount to deposit (e.g., `!deposit 100` or `!deposit all`).';
      return isSlash ? ctx.reply({ content: replyContent, ephemeral: true }) : ctx.reply(replyContent);
    }

    const userData = getUser(author.id);
    let amountToDeposit;

    if (amountStr.toLowerCase() === 'all') {
      amountToDeposit = userData.souls;
    } else {
      amountToDeposit = parseInt(amountStr, 10);
    }

    if (isNaN(amountToDeposit) || amountToDeposit <= 0) {
      const replyContent = 'Please provide a valid amount to deposit.';
      return isSlash ? ctx.reply({ content: replyContent, ephemeral: true }) : ctx.reply(replyContent);
    }

    if (amountToDeposit > userData.souls) {
      const replyContent = "You can't deposit more souls than you have in your wallet.";
      return isSlash ? ctx.reply({ content: replyContent, ephemeral: true }) : ctx.reply(replyContent);
    }

    const newSouls = userData.souls - amountToDeposit;
    const newBank = userData.bank + amountToDeposit;

    updateUser(author.id, {
      souls: newSouls,
      bank: newBank,
    });

    updateUserRank(author.id, ctx.channel);

    const replyContent = `You have successfully deposited **Ѫ ${amountToDeposit.toLocaleString()}** into your bank.`;
    if (isSlash) {
        await ctx.reply({ content: replyContent, ephemeral: true });
    } else {
        await ctx.reply(replyContent);
    }
  },
};