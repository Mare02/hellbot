const config = require('../../../utils/config');

function getTargetGuildId() {
  return config.isDevMode ? config.testingServerId : config.homeServerId;
}

function isAuthorizedRequester(user) {
  return Boolean(
    user?.id &&
      (user.id === config.owner.id || config.guildToolUserIds.includes(user.id))
  );
}

function assertAuthorizedServer(guild, user) {
  if (!isAuthorizedRequester(user))
    throw new Error('This server tool is available only to authorized users.');
  if (guild?.id !== getTargetGuildId())
    throw new Error('This server tool is limited to the configured Hellbot server.');
  return guild;
}

function canUseServerTools(channel, user) {
  return Boolean(
    channel?.guild && isAuthorizedRequester(user) && channel.guild.id === getTargetGuildId()
  );
}

module.exports = { assertAuthorizedServer, canUseServerTools };
