require('dotenv').config();
const discordRoutingDefaults = require('../data/discordRoutingDefaults');
const { createLegacyConfig } = require('../services/config/legacyConfig');
const { getProfile, initializeRuntimeConfig } = require('../services/config/runtime');

const legacy = createLegacyConfig({
  ...process.env,
  NODE_ENV: getProfile() === 'dev' ? 'development' : 'production',
});

module.exports = new Proxy(legacy, {
  get(target, property) {
    if (
      Object.hasOwn(discordRoutingDefaults, property) ||
      ['commandsPrefix', 'embedColor', 'roleRequests', 'features', 'behavior', 'ai'].includes(
        property
      )
    ) {
      return initializeRuntimeConfig().snapshot[property];
    }
    if (property === 'currentAiProvider') return initializeRuntimeConfig().snapshot.ai.provider;
    if (property === 'currentGeminiModel')
      return initializeRuntimeConfig().snapshot.ai.models.google.text;
    if (property === 'currentAiModel') {
      const ai = initializeRuntimeConfig().snapshot.ai;
      return (
        ai.customProviders.find((item) => item.id === ai.provider)?.model ||
        ai.models[ai.provider]?.text
      );
    }
    return Reflect.get(target, property);
  },
});
