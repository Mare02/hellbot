const { RESTJSONErrorCodes } = require('discord-api-types/v10');

async function fetchGuildBan(guild, userId) {
  try {
    return await guild.bans.fetch({ user: userId, force: true, cache: false });
  } catch (error) {
    if (error.code === RESTJSONErrorCodes.UnknownBan) return null;
    throw error;
  }
}

module.exports = { fetchGuildBan };
