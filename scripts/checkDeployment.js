require('dotenv').config();
const assert = require('node:assert/strict');
const { setTimeout: delay } = require('node:timers/promises');
const { requestBot } = require('../src/services/ipc');

async function checkDeployment() {
  const base = `http://127.0.0.1:${process.env.DASHBOARD_PORT || 3001}`;
  let lastError;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    try {
      const page = await fetch(`${base}/overview`, { signal: AbortSignal.timeout(5000) });
      assert.equal(page.status, 200, 'Dashboard page is unavailable.');
      assert((await page.text()).includes('type="module"'), 'Dashboard build is unavailable.');
      const response = await fetch(`${base}/api/profiles`, { signal: AbortSignal.timeout(5000) });
      assert.equal(response.status, 200, 'Dashboard API is unavailable.');
      const dashboard = await response.json();
      assert.equal(dashboard.profile, 'prod', 'Dashboard is not in production mode.');
      const bot = await requestBot('prod');
      assert(bot.online && bot.ready, 'Production bot is not connected to Discord.');
      if (process.env.DEPLOY_SHA) {
        assert.equal(dashboard.deploymentSha, process.env.DEPLOY_SHA, 'Dashboard is running another revision.');
        assert.equal(bot.deploymentSha, process.env.DEPLOY_SHA, 'Bot is running another revision.');
      }
      console.log('Production bot and built dashboard are ready.');
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 14) await delay(2000);
    }
  }
  throw lastError;
}

if (require.main === module) {
  checkDeployment().catch(() => {
    console.error('Deployment health check failed: bot or dashboard did not become ready.');
    process.exitCode = 1;
  });
}

module.exports = { checkDeployment };
