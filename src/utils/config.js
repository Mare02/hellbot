const aiModels = require('../data/aiModels');

module.exports = {
  commandsPrefix: "::",
  commandsPrefixDev: "dev::",
  owner: {
    id: "652993719808557087",
    name: "hellismyrestingplace",
  },
  staffIds: [
    "652993719808557087",
  ],
  discordMsgLengthLimit: 2000,
  embedColor: '#007bff',
  currentAiModel: aiModels.mistral7b,
}