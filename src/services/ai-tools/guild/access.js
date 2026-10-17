const config = require('../../../utils/config');

const targetGuildId = config.isDevMode ? config.testingServerId : config.homeServerId;

function isAuthorizedRequester(user) {
  return user?.id === config.owner.id;
}

function assertAuthorizedServer(guild, user) {
  if (!isAuthorizedRequester(user)) throw new Error('This server tool is available only to the bot owner.');
  if (guild?.id !== targetGuildId) throw new Error('This server tool is limited to the configured Hellbot server.');
  return guild;
}

function canUseServerTools(channel, user) {
  return Boolean(channel?.guild && isAuthorizedRequester(user) && channel.guild.id === targetGuildId);
}

module.exports = { assertAuthorizedServer, canUseServerTools };
