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
      const attachments = repliedMessage.attachments;

      if (!attachments.size) {
        message.channel.send(messages.emptyState.noAttachmentInReply, { reply: { messageReference: null } });
        return;
      }

      const authorText = args.join(' ') || repliedMessage.author.displayName;

      const channel = await message.guild.channels.fetch(config.masterCreationsChannelId);
      await channel.send({content: authorText, files: attachments.map(a => a.url), reply: { messageReference: null }});

      message.channel.send(`Selected design is now displayed in the <#${config.masterCreationsChannelId}>`);
    } catch (error) {
      console.log(error);
      await message.channel.send(error.message);
    }
  },
};

