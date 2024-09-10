require('dotenv').config();
const { ADMIN } = require('../utils/roles');
const config = require('../utils/config');

module.exports = {
  name: 'getbotinfo',
  description: 'Get technical bot information.',
  slash: true,
  async execute(interaction, args) {
    const info = `
**Name:** ${config.bot.name} (${config.bot.version}) (${config.bot.decription})
**Owner:** ${config.owner.name} (${config.owner.id})
**Environment:** ${process.env.NODE_ENV}
**Commands prefix:** ${config.commandsPrefix}
**Using AI model:** ${config.currentAiModel}
**Host sytem:** ${process.platform} ${process.arch}
    `
    if(!args){
      interaction.reply(info);
    } else {
      interaction.channel.send(info);
    }
  },
};
