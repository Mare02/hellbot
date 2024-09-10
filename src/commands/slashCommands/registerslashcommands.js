const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const config = require('../../utils/config');
const slashCommands = require('../slashCommands');
const { ADMIN } = require('../../utils/roles');

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

module.exports = {
  perm: ADMIN,
  name: 'registerslashcommands',
  async execute(message) {
    try {
      let guildId = config.homeServerId;
      if (message) {
        guildId = message.guild.id;
      }

      await rest.put(Routes.applicationGuildCommands(config.bot.appId, guildId), {
        body: slashCommands,
      }).then(() => {
        if (message) {
          message.channel.send('Slash commands registered successfully!');
        }
      }).catch(error => {
        throw error;
      });
    } catch (error) {
      console.error(error);
      if (message) {
        message.channel.send(`Failed to register slash commands: ${error.message}`);
      }
    }
  }
}
