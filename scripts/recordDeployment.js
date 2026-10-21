require('dotenv').config();
const { initializeDatabase } = require('../src/services/database');
const { getProfile } = require('../src/services/config/runtime');
const { recordRelease } = require('../src/services/deployments/release');
const { checkDeployment } = require('./checkDeployment');

async function recordDeployment() {
  if (!/^[a-f0-9]{40}$/.test(process.env.DEPLOY_SHA || '')) {
    throw new Error('A complete DEPLOY_SHA is required to verify a deployment.');
  }
  await checkDeployment();
  const database = initializeDatabase();
  try {
    recordRelease(database, {
      profile: getProfile(),
      sha: process.env.DEPLOY_SHA,
      runId: process.env.DEPLOY_RUN_ID || null,
      attempt: process.env.DEPLOY_RUN_ATTEMPT || 1,
    });
    console.log('Health-verified production release recorded.');
  } finally {
    database.close();
  }
}

recordDeployment().catch(() => {
  console.error('Could not verify and record the deployed release.');
  process.exitCode = 1;
});
