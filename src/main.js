require('dotenv').config();
const { getProfile, initializeRuntimeConfig, peekSecrets } = require('./services/config/runtime');
const { installConsoleLogging } = require('./services/logging');
const { startBotIpc } = require('./services/ipc');

let runtime;
let client;
let closeIpc;
let stopJobs;
let cleanupLogging;
let stopping = false;

async function shutdown() {
  if (stopping) return;
  stopping = true;
  try {
    stopJobs?.();
    await client?.destroy();
  } finally {
    try {
      if (closeIpc) await closeIpc();
    } finally {
      try {
        runtime?.close();
      } finally {
        cleanupLogging?.();
      }
    }
  }
}

async function start() {
  const profile = getProfile();
  cleanupLogging = installConsoleLogging({ profile, component: 'bot', secretProvider: peekSecrets });
  runtime = initializeRuntimeConfig();
  if (profile === 'dev' && (!process.env.DEV_DISCORD_TOKEN || !process.env.DEV_CLIENT_ID)) {
    throw new Error(
      'An explicit dev profile requires DEV_DISCORD_TOKEN and DEV_CLIENT_ID for its separate Discord application.'
    );
  }
  const { getInstance, getLoginPromise } = require('./client');
  client = getInstance();
  const listeners = require('./listeners');
  const { startJobs } = require('./kernel');
  const Bugsnag = require('@bugsnag/js');
  if (process.env.BUGSNAG_API_KEY) Bugsnag.start({ apiKey: process.env.BUGSNAG_API_KEY });

  client.on('clientReady', () => console.info('Discord bot connected', { profile }));
  Object.values(listeners).forEach((listener) => listener(client));
  stopJobs = startJobs(client, runtime);
  closeIpc = await startBotIpc(runtime, () => client.isReady());
  process.once('SIGINT', () =>
    shutdown().catch(() => {
      process.exitCode = 1;
    })
  );
  process.once('SIGTERM', () =>
    shutdown().catch(() => {
      process.exitCode = 1;
    })
  );
  await getLoginPromise();
}

start().catch(async (error) => {
  console.error('Bot startup failed', { error });
  process.exitCode = 1;
  await shutdown().catch(() => console.error('Bot shutdown did not complete cleanly.'));
});
