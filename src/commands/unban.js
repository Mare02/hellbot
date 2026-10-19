const { PermissionFlagsBits } = require('discord.js');
const messages = require("../utils/messages");
const { reply } = require("../utils/helpers");
const syslog = require('../commands/syslog');

module.exports = {
  name: "unban",
  description: "Unbans a user from the server.",
  slash: true,
  perm: PermissionFlagsBits.BanMembers,
  params: [
    {
      name: "user",
      description: "The user to unban (ID)",
      type: 3, // Type 3 is for STRING
      required: true,
    },
  ],
  async execute(interaction, args) {
    try {
      if (!args) {
        await interaction.deferReply();
      }

      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
        await reply(interaction, args, "I don't have permission to perform this action.");
        return;
      }

      const userId = args ? (args[0] || "").replace(/[<@!>]/g, "") : interaction.options.getString("user");

      if (!userId || userId === '') {
        await reply(interaction, args, 'Please provide a user ID.');
        return;
      }

      const bans = await interaction.guild.bans.fetch();
      const isBanned = bans.has(userId);

      if (!isBanned) {
        await reply(interaction, args, `User with ID **${userId}** is not banned.`);
        return;
      }

      await interaction.guild.members.unban(userId);

      let replyMessage = `User with ID **${userId}** has been unbanned.`;
      await reply(interaction, args, replyMessage);

      await syslog.execute(interaction, [], replyMessage);
    }
    catch (error) {
      console.error(error.message);
      await reply(
        interaction,
        args,
        error.message.includes("permission")
          ? messages.errorState.permissionError
          : messages.errorState.commandError
      );
    }
  },
};
