const aiModels = require('../../data/aiModels');
const discordRoutingDefaults = require('../../data/discordRoutingDefaults');
const { createLegacyConfig } = require('./legacyConfig');
const { profileEnvSchema, parseProfileConfig } = require('./schema');

function createInitialConfig(profileEnv, env) {
  const profile = profileEnvSchema.parse(profileEnv);
  const legacy = createLegacyConfig({
    ...env,
    NODE_ENV: profile === 'dev' ? 'development' : 'production',
  });

  return parseProfileConfig(profile, {
    ...Object.fromEntries(
      Object.keys(discordRoutingDefaults).map((field) => [field, legacy[field]])
    ),
    commandsPrefix: legacy.commandsPrefix,
    embedColor: legacy.embedColor,
    ai: {
      provider: ['groq', 'google'].includes(legacy.currentAiProvider)
        ? legacy.currentAiProvider
        : 'groq',
      customProviders: [],
      models: {
        groq: {
          text: legacy.currentAiProvider === 'groq' ? legacy.currentAiModel : aiModels.gpt_oss_120b,
          vision: aiModels.qwen3_8_27b,
        },
        google: {
          text: legacy.currentGeminiModel,
          vision: legacy.currentGeminiModel,
        },
      },
    },
    roleRequests: { ...legacy.roleRequests },
  });
}

function getConfigDefaults(profileEnv) {
  return createInitialConfig(profileEnv, {});
}

module.exports = { createInitialConfig, getConfigDefaults };
