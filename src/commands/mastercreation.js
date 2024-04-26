const messages = require('../utils/messages');
const config = require('../utils/config');
const { ADMIN } = require('../utils/roles');

module.exports = {
  name: 'mastercreation',
  description: 'Displays an SFS design in the Master Creations channel.',
  perm: ADMIN,
  async execute(message, args) {
    try {
      if (
        !message.reference
      ) {
        message.channel.send(messages.emptyState.noAttachmentInReply);
        return;
      }
      const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
      const attachment = repliedMessage.attachments.first();

      if (!attachment) {
        message.channel.send(messages.emptyState.noAttachmentInReply, { reply: { messageReference: null } });
        return;
      }

      const authorText = args.join(' ');

      const channel = await message.guild.channels.fetch(config.masterCreationsChannelId);
      await channel.send({content: authorText, files: [attachment], reply: { messageReference: null }});

      message.channel.send(messages.success.sentToMasterCreations);
    } catch (error) {
      console.log(error);
      await message.channel.send(error.message);
    }
  },
};

