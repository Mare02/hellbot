const config = require('./config');

function isGuildEnabled(guildId) {
  return !guildId || !config.disabledGuildIds.includes(guildId);
}

module.exports = { isGuildEnabled };
