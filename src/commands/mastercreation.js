const { EmbedBuilder } = require('discord.js');
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
        || !message.reference.attachments
        || !message.reference.attachments.first().contentType.includes('image')
      ) {
        message.channel.send('Please reply to a message containing the image attachment.');
        return;
      }
      const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
      const attachment = repliedMessage.attachments.first();

      const channel = await message.guild.channels.fetch('720012600938594306');
      await channel.send({content: repliedMessage.author.username, files: [attachment]});

      message.channel.send('The design has been sent to the Master Creations channel.');
    } catch (error) {
      console.log(error);
      await message.channel.send(error.message);
    }
  },
};

