require('dotenv').config();
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { initializeDatabase } = require('../services/database');
const { createSecretStore } = require('../services/config/secrets');
const { installConsoleLogging } = require('../services/logging');
const { createApi } = require('./api');

const app = express();
const dashboardDist = path.resolve(__dirname, '../../dashboard/dist');
const indexPath = path.join(dashboardDist, 'index.html');
const port = Number(process.env.DASHBOARD_PORT || 3001);
const serveStatic = process.env.HELLBOT_DASHBOARD_DEV !== 'true';

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('DASHBOARD_PORT must be an integer between 1 and 65535.');
}

if (serveStatic && !fs.existsSync(indexPath)) {
  throw new Error('Dashboard build is missing. Run npm run dashboard:build first.');
}

const database = initializeDatabase();
let sensitiveKeys = {};
const cleanupLogging = installConsoleLogging({
  profile: 'dashboard',
  component: 'dashboard',
  secretProvider: () => sensitiveKeys,
});
try {
  const secrets = createSecretStore(database);
  const refreshSecrets = () => {
    sensitiveKeys = secrets.readAll();
  };
  refreshSecrets();
  app.disable('x-powered-by');
  app.use((request, response, next) => {
    response.set('X-Content-Type-Options', 'nosniff');
    response.set('X-Frame-Options', 'DENY');
    response.set('Referrer-Policy', 'no-referrer');
    response.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    );
    next();
  });
  app.use('/api', createApi(database, port, { onSecretsChanged: refreshSecrets }));
  if (serveStatic) {
    app.use(express.static(dashboardDist));
    app.use((request, response, next) => {
      if (request.method !== 'GET' || request.path === '/api' || request.path.startsWith('/api/')) {
        return next();
      }
      response.sendFile(indexPath);
    });
  }
} catch (error) {
  console.error('Dashboard startup failed', { error });
  database.close();
  cleanupLogging();
  process.exitCode = 1;
  return;
}

const server = app.listen(port, '127.0.0.1', (error) => {
  if (error) {
    database.close();
    throw error;
  }
  console.log(`Hellbot dashboard is listening on 127.0.0.1:${port}`);
  if (process.send) process.send({ type: 'dashboard-ready' });
});

server.on('close', () => {
  if (database.open) database.close();
  cleanupLogging();
});
process.once('SIGINT', () => server.close());
process.once('SIGTERM', () => server.close());
