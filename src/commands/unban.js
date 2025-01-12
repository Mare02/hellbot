const messages = require("../utils/messages");
const { reply } = require("../utils/helpers");
const { MODERATOR } = require('../utils/roles');
const syslog = require('../commands/syslog');

module.exports = {
  name: "unban",
  description: "Unbans a user from the server.",
  slash: true,
  perm: MODERATOR,
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

      if (!interaction.member.permissions.has("BAN_MEMBERS")) {
        await reply(interaction, args, messages.system.noPermission);
        return;
      }

      const userId = args[0];

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

      await interaction.guild.members.unban(userId).catch(() => null);

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
