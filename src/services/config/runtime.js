const { EventEmitter } = require('node:events');
const { initializeDatabase } = require('../database');
const { createConfigStore } = require('./store');
const { createSecretStore } = require('./secrets');
const { profileEnvSchema } = require('./schema');

let runtime;

function getProfile() {
  return profileEnvSchema.parse(process.env.NODE_ENV === 'development' ? 'dev' : 'prod');
}

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function initializeRuntimeConfig() {
  if (runtime) return runtime;
  const profile = getProfile();
  const database = initializeDatabase();
  const store = createConfigStore(database);
  const secrets = createSecretStore(database);
  const events = new EventEmitter();
  let state;
  let appliedAt;
  let rotations = {};

  function reload() {
    const next = database.transaction(() => ({
      config: store.read(profile),
      secrets: secrets.readAll(),
    }))();
    const previous = state;
    const previousRotations = rotations;
    state = freeze(next);
    rotations = {};
    try {
      events.emit('change', { previous: previous?.config, current: state.config });
    } catch (error) {
      state = previous;
      rotations = previousRotations;
      if (previous) {
        try {
          events.emit('change', { previous: next.config, current: previous.config });
        } catch {
          console.error('Could not restore configuration consumers after a failed refresh.');
        }
      }
      throw error;
    }
    appliedAt = new Date().toISOString();
    return { appliedAt };
  }

  try {
    reload();
    runtime = {
      profile,
      get snapshot() {
        return state.config;
      },
      get secretValues() {
        return state.secrets;
      },
      get appliedAt() {
        return appliedAt;
      },
      reload,
      onChange(handler) {
        events.on('change', handler);
        return () => events.off('change', handler);
      },
      nextKey(provider) {
        const keys = state.secrets[provider] || [];
        if (!keys.length)
          throw new Error(
            'No API key is configured for this provider. Add a shared API key in the dashboard.'
          );
        const index = (rotations[provider] || 0) % keys.length;
        rotations[provider] = index + 1;
        return keys[index];
      },
      close() {
        events.removeAllListeners();
        database.close();
        runtime = undefined;
      },
    };
    return runtime;
  } catch (error) {
    database.close();
    throw error;
  }
}

function peekSecrets() {
  return runtime?.secretValues || {};
}

module.exports = { getProfile, initializeRuntimeConfig, peekSecrets };
