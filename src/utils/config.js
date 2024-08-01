const aiModels = require('../data/aiModels');

module.exports = {
  bot: {
    name: "Hellbot",
    decription: "Hell's Resting Place - custom made model",
    version: "0.8",
  },
  commandsPrefix: "::",
  commandsPrefixDev: "dev::",
  owner: {
    id: "652993719808557087",
    name: "hellismyrestingplace",
  },
  staffIds: [
    "652993719808557087",
  ],
  homeServerId: "720011764934115400",
  logChannelId: "732790467615391846",
  generalChannelId: "720011765672444007",
  masterCreationsChannelId: "858872397935018024",
  ticketMessageServerBlacklist: [
    '700100389575458897',
  ],
  discordMsgLengthLimit: 2000,
  embedColor: '#fc9803',
  currentAiModel: aiModels.mistral7b,
}