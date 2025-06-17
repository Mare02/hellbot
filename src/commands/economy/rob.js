const { getUser, updateUser } = require('../../services/economyService');

const COOLDOWN_MINUTES = 60;
const COOLDOWN_MS = COOLDOWN_MINUTES * 60 * 1000;
const SUCCESS_CHANCE = 0.5; // 50%
const PENALTY_MULTIPLIER = 0.75; // 75% of what they tried to steal
const MIN_REQUIRED_SOULS = 500; // Victim must have this much to be a target

module.exports = {
  name: 'rob',
  description: 'Attempt to rob another user of their wallet souls. High risk, high reward.',
  slash: true,
  params: [
    {
      name: 'user',
      description: 'The user you want to attempt to rob.',
      type: 6, // USER type
      required: true,
    },
  ],

  async execute(ctx, args) {
    const isSlash = !args;
    const author = isSlash ? ctx.user : ctx.author;

    const reply = (content, ephemeral = true) => {
        const payload = { content, ephemeral };
        return isSlash ? ctx.reply(payload) : ctx.reply(content);
    };

    let targetUser;
    if (isSlash) {
        targetUser = ctx.options.getUser('user');
    } else {
        targetUser = ctx.mentions.users.first();
    }

    if (!targetUser) {
        return reply('You need to mention a user to rob.');
    }

    if (targetUser.id === author.id) {
        return reply("You can't rob yourself, you criminal mastermind.");
    }

    if (targetUser.bot) {
        return reply("Bots have no souls to steal. It's a sad reality.");
    }

    const authorData = getUser(author.id);
    const now = Date.now();
    const timeSinceLastRob = now - authorData.last_rob_attempt;

    if (timeSinceLastRob < COOLDOWN_MS) {
        const timeLeft = COOLDOWN_MS - timeSinceLastRob;
        const minutesLeft = Math.ceil(timeLeft / (1000 * 60));
        return reply(`You need to wait another ${minutesLeft} minute(s) before attempting another robbery.`);
    }

    const targetData = getUser(targetUser.id);
    if (targetData.souls < MIN_REQUIRED_SOULS) {
        return reply(`${targetUser.username} is too poor to be worth robbing.`);
    }

    // --- Robbery Logic ---
    if (Math.random() < SUCCESS_CHANCE) {
        // Success!
        const maxStealAmount = Math.floor(targetData.souls * 0.25); // Steal up to 25%
        const amountStolen = Math.floor(Math.random() * maxStealAmount) + 1;

        updateUser(author.id, { souls: authorData.souls + amountStolen, last_rob_attempt: now });
        updateUser(targetUser.id, { souls: targetData.souls - amountStolen });

        return reply(`**Success!** You discreetly relieved ${targetUser.username} of **Ѫ ${amountStolen.toLocaleString()}**!`, false);

    } else {
        // Failure!
        const penaltyAmount = Math.floor(targetData.souls * 0.25 * PENALTY_MULTIPLIER);

        updateUser(author.id, { souls: authorData.souls - penaltyAmount, last_rob_attempt: now });

        return reply(`**Failure!** You were caught trying to rob ${targetUser.username} and had to pay a fine of **Ѫ ${penaltyAmount.toLocaleString()}**.`, false);
    }
  },
};