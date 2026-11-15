const { PermissionFlagsBits } = require('discord.js');
const messages = require("../utils/messages");
const { reply } = require("../utils/helpers");
const syslog = require('../commands/syslog');
const { outranksTarget } = require('../utils/permissions');
const { notifyMember } = require('../utils/moderationNotices');

module.exports = {
  name: "kick",
  description: "Kicks a user from the server.",
  slash: true,
  perm: PermissionFlagsBits.KickMembers,
  params: [
    {
      name: "user",
      description: "The user to kick",
      type: 6,
      required: true,
    },
    {
      name: "reason",
      description: "Reason for the kick",
      required: false,
    },
  ],
  async execute(interaction, args) {
    try {
      if (!args) {
        await interaction.deferReply();
      }

      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
        await reply(interaction, args, "I don't have permission to kick members!");
        return;
      }

      const userId = args ? args[0] : interaction.options.getUser("user").id;

      let userToKick;
      if (!args) {
        userToKick = await interaction.guild.members
          .fetch(interaction.options.getUser("user"))
          .catch(() => null);
      } else if (interaction.mentions.users.size) {
        userToKick = await interaction.guild.members
          .fetch(interaction.mentions.users.first().id)
          .catch(() => null);
      } else if (!interaction.mentions.users.size && args.length) {
        userToKick = await interaction.guild.members
          .fetch(userId)
          .catch(() => null);
      }

      if (!userToKick || Array.isArray(userToKick)) {
        await reply(
          interaction,
          args,
          "User not found. Please provide a valid user ID or mention."
        );
        return;
      }

      if (userToKick.id === interaction.guild.ownerId) {
        await reply(interaction, args, "Cannot kick the server owner!");
        return;
      }
      
      if (!outranksTarget(interaction.member, userToKick)) {
        await reply(interaction, args, "You can't kick a user with an equal or higher role than yours.");
        return;
      }

      if (!userToKick.kickable) {
        await reply(interaction, args, "This user cannot be kicked (higher role/privileges)");
        return;
      }

      const reason = args ? args.slice(1).join(" ") || undefined : interaction.options.getString("reason") || undefined;

      let replyMessage = `**${userToKick.displayName}** has been kicked.`;
      if (reason) {
        replyMessage += ` Reason: ${reason}.`;
      }

      await notifyMember(userToKick, 'kicked', reason);
      await userToKick.kick(reason);

      await reply(interaction, args, replyMessage);

      await syslog.execute(interaction, [], `**${userToKick.displayName}** has been kicked.`, userToKick, [{
        name: 'Reason', 
        value: reason || "No reason provided"
      }]);
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
