const messages = require('../utils/messages');
const config = require('../utils/config');
const { ADMIN } = require('../utils/roles');

module.exports = {
  name: 'masterphoto',
  description: 'Displays a photo in the Master Photos channel.',
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

      const channel = await message.guild.channels.fetch(config.masterPhotosChannelId);
      await channel.send({content: authorText, files: attachments.map(a => a.url), reply: { messageReference: null }});

      message.channel.send(`Selected photo is now displayed in the <#${config.masterPhotosChannelId}>`);
    } catch (error) {
      console.log(error);
      await message.channel.send(error.message);
    }
  },
};

