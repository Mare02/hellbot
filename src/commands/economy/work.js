const { EmbedBuilder } = require('discord.js');
const { getUser, updateUser, getUserInventory, getItemById } = require('../../services/economyService');
const workOutcomes = require('../../utils/workOutcomes');

// const COOLDOWN_HOURS = 1;
// const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000;
const COOLDOWN_MS = 0;

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getWorkResult() {
    const roll = Math.random();
    if (roll < 0.05) { // 5% chance of rare success
        return workOutcomes.rare[Math.floor(Math.random() * workOutcomes.rare.length)];
    }
    if (roll < 0.20) { // 15% chance of failure
        return workOutcomes.fail[Math.floor(Math.random() * workOutcomes.fail.length)];
    }
    // 80% chance of normal success
    return workOutcomes.success[Math.floor(Math.random() * workOutcomes.success.length)];
}

module.exports = {
  name: 'work',
  description: 'Work to earn some souls. Has a 1-hour cooldown.',
  slash: true,

  async execute(interaction) {
    const userId = interaction.author.id;
    const userData = getUser(userId);
    const now = Date.now();

    const timeSinceLastWork = now - userData.lastWork;

    if (timeSinceLastWork < COOLDOWN_MS) {
      const timeLeft = COOLDOWN_MS - timeSinceLastWork;
      const minutesLeft = Math.ceil(timeLeft / (1000 * 60));
      const replyContent = `You're too tired to work. You need to rest for another **${minutesLeft} minute(s)**.`;

      return interaction.isCommand?.()
        ? interaction.reply({ content: replyContent, ephemeral: true })
        : interaction.reply(replyContent);
    }

    const result = getWorkResult();
    let soulsEarned = getRandomInt(result.souls[0], result.souls[1]);

    // --- Bonus Calculation ---
    const userInventory = getUserInventory(userId);
    const workBonus = userInventory.reduce((totalBonus, invItem) => {
        const itemDetails = getItemById(invItem.itemId);
        if (itemDetails?.bonus_type === 'work_multiplier') {
            return totalBonus + itemDetails.bonus_value;
        }
        return totalBonus;
    }, 0);

    if (workBonus > 0) {
      const bonusAmount = Math.floor(soulsEarned * workBonus);
      soulsEarned += bonusAmount;
    }
    // --- End Bonus Calculation ---

    const newSouls = userData.souls + soulsEarned;
    const newNetWorth = userData.netWorth + soulsEarned;

    updateUser(userId, {
        souls: newSouls,
        netWorth: newNetWorth,
        lastWork: now
    });

    const embed = new EmbedBuilder()
      .setTitle('Back to the Grind')
      .setDescription(result.message)
      .setFooter({ text: 'Hellbot Economy' })
      .setTimestamp();

    if (soulsEarned > 0) {
        embed.setColor('#00ff00').addFields({ name: 'Souls Earned', value: `Ѫ ${soulsEarned.toLocaleString()}` });
    } else {
        embed.setColor('#ff0000').addFields({ name: 'Souls Lost', value: `Ѫ ${soulsEarned.toLocaleString()}` });
    }

    const bonusItems = userInventory
        .map(invItem => getItemById(invItem.itemId))
        .filter(item => item?.bonus_type === 'work_multiplier')
        .map(item => item.name);

    if (bonusItems.length > 0) {
      embed.addFields({ name: 'Bonus From', value: bonusItems.join(', ') });
    }

    await interaction.reply({ embeds: [embed] });
  },
};