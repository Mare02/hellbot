const { initializeRuntimeConfig } = require('./config/runtime');

function recordGuildInteraction(guildId, interactionType) {
  if (!guildId) return;

  try {
    const runtime = initializeRuntimeConfig();
    runtime.guildActivity.record(runtime.profile, guildId, interactionType);
  } catch (error) {
    console.error('Could not record server activity.', { guildId, interactionType, error });
  }
}

module.exports = { recordGuildInteraction };
