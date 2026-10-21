const discordRoutingDefaults = require('../../data/discordRoutingDefaults');
const aiModels = require('../../data/aiModels');

function createLegacyConfig(env) {
  const isDevMode = env.NODE_ENV === 'development';
  const currentAiProvider = (env.AI_PROVIDER || 'groq').trim().toLowerCase();
  const currentGeminiModel = aiModels.gemini_3_5_flash_lite;
  const botAppId = isDevMode ? env.DEV_CLIENT_ID || env.CLIENT_ID : env.CLIENT_ID;
  const botPublicKey = isDevMode ? env.PUBLIC_KEY_DEV || env.PUBLIC_KEY : env.PUBLIC_KEY;
  const botToken = isDevMode ? env.DEV_DISCORD_TOKEN || env.DISCORD_TOKEN : env.DISCORD_TOKEN;

  return {
    bot: {
      name: 'Hellbot',
      description: "The Custom General-Purpose Bot for Hell's Resting Place™",
      version: '2.0',
      appId: botAppId,
      publicKey: botPublicKey,
      token: botToken,
      inviteLink: `https://discord.com/api/oauth2/authorize?client_id=${botAppId}&permissions=8&scope=bot`,
    },

    commandsPrefix: isDevMode ? 'dev::' : '::',

    isDevMode,

    owner: {
      id: '652993719808557087',
      name: 'hellismyrestingplace',
    },

    ...discordRoutingDefaults,

    roleRequests: {
      requestChannelId: isDevMode ? '1553890262902644786' : '795486828190105622',
      reviewChannelId: isDevMode ? '1553890264337219646' : '1553912040849154189',
      anchorRoleName: isDevMode ? null : 'God Modder',
    },

    discordMsgLengthLimit: 2000,
    embedColor: '#fc9803',

    currentAiProvider,
    currentAiModel: currentAiProvider === 'google' ? currentGeminiModel : aiModels.gpt_oss_120b,
    currentGeminiModel,
  };
}

module.exports = { createLegacyConfig };
