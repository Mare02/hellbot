const { EmbedBuilder } = require('discord.js');
const { getUser } = require('../../services/economyService');

module.exports = {
  name: 'balance',
  description: "Check your or another user's soul balance.",
  slash: true,
  params: [
    {
      name: 'user',
      description: 'The user whose balance you want to see.',
      type: 6, // USER type
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

    const embed = new EmbedBuilder()
      .setTitle(`${targetUser.username}'s Balance`)
      .setColor('#ff0000')
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: '💰 Souls', value: `Ѫ ${userData.souls.toLocaleString()}`, inline: true },
        { name: '🏦 Bank', value: `Ѫ ${userData.bank.toLocaleString()}`, inline: true },
      )
      .setFooter({ text: 'Hellbot Economy' })
      .setTimestamp();

    if (isSlash) {
      await ctx.reply({ embeds: [embed], ephemeral: true });
    } else {
      await ctx.reply({ embeds: [embed] });
    }
  },
};