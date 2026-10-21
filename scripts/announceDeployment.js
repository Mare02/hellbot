require('dotenv').config();
const { initializeRuntimeConfig } = require('../src/services/config/runtime');

let runtime;
async function announce() {
  runtime = initializeRuntimeConfig();
  await require('../src/jobs/botUpdatedJob').execute(process.env.COMMIT_MESSAGE);
}

announce().catch(() => {
  console.error('Deployment announcement failed. Check bot access and update-channel configuration.');
  process.exitCode = 1;
}).finally(() => runtime?.close());
