const { PermissionFlagsBits } = require('discord.js');
const messages = require("../utils/messages");
const { reply } = require("../utils/helpers");
const syslog = require('../commands/syslog');
const dm = require('../commands/dm');

module.exports = {
  name: "ban",
  description: "Bans a user from the server.",
  slash: true,
  perm: PermissionFlagsBits.BanMembers,
  params: [
    {
      name: "user",
      description: "The user to ban",
      type: 6,
      required: true,
    },
    {
      name: "reason",
      description: "Reason for the ban",
      required: false,
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

      const userId = args ? (args[0] || "").replace(/[<@!>]/g, "") : interaction.options.getUser("user").id;

      const bans = await interaction.guild.bans.fetch();
      const isBanned = bans.has(userId);

      if (isBanned) {
        await reply(interaction, args, `User with ID **${userId}** is already banned.`);
        return;
      }

      let userToBan;
      if (!args) {
        userToBan = await interaction.guild.members
          .fetch(interaction.options.getUser("user"))
          .catch(() => null);
      } else if (interaction.mentions.users.size) {
        userToBan = await interaction.guild.members
          .fetch(interaction.mentions.users.first().id)
          .catch(() => null);
      } else if (!interaction.mentions.users.size && args.length) {
        userToBan = await interaction.guild.members
          .fetch(userId)
          .catch(() => null);
      }

      if (!userToBan || Array.isArray(userToBan)) {
        await reply(
          interaction,
          args,
          "User not found. Please provide a valid user ID or mention."
        );
        return;
      }

      const reason = args ? args.slice(1).join(" ") || undefined : interaction.options.getString("reason") || undefined;

      let replyMessage = `**${userToBan.displayName}** has been banned.`;
      if (reason) {
        replyMessage += ` Reason: ${reason}.`;
      }

      if (!userToBan.bannable) {
        await reply(interaction, args, "This user cannot be banned (higher role/privileges).");
        return;
      }

      await userToBan.ban({ reason });

      await reply(interaction, args, replyMessage);

      await dm.execute(interaction, [userToBan.id, `You have been banned from ${interaction.guild.name}.\nReason: ${reason}.`]);

      await syslog.execute(interaction, [], `**${userToBan.displayName}** has been banned.`, userToBan, [{ name: 'Reason', value: reason }]);
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
