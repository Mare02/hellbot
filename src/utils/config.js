const aiModels = require('../data/aiModels');
require('dotenv').config();

module.exports = {
  bot: {
    name: "Hellbot",
    decription: "The Custom General-Purpose Bot for Hell's Resting Place™",
    version: "1.2",
    appId: process.env.CLIENT_ID,
    inviteLink: `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot`,
  },

  commandsPrefix: process.env.NODE_ENV === 'development' ? "dev::" : "::",

  isDevMode: process.env.NODE_ENV === 'development',

  owner: {
    id: "652993719808557087",
    name: "hellismyrestingplace",
  },

  homeServerId: "720011764934115400",
  logChannelId: "732790467615391846",
  verifyChannelId: "830224625350344724",
  generalChannelId: "720011765672444007",
  masterCreationsChannelId: "858872397935018024",
  masterPhotosChannelId: "1275913045981397105",

  staffRoleIds: {
    unlocked: '730563949279445164',
    headAdmin: '728767822557085786',
    admin: '720021731846127666',
    headModerator: '834772331922063400',
    moderator: '1037545653087256657',
  },
  verifiedRoleId: '1051882112057348146',

  discordMsgLengthLimit: 2000,
  embedColor: '#fc9803',

  currentAiModel: aiModels.mistral7b,
}
