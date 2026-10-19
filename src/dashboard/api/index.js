const express = require('express');
const { REST, Routes, User } = require('discord.js');
const { z } = require('zod');
const { createConfigStore } = require('../../services/config/store');
const { createSecretStore } = require('../../services/config/secrets');
const { createLegacyConfig } = require('../../services/config/legacyConfig');
const { requestBot, notifyBots } = require('../../services/ipc');
const { readLogs, withLogContext } = require('../../services/logging');
const { createOriginCheck } = require('../middleware/origin');
const { checkKey } = require('./checkKey');
const { getProfile } = require('../../services/config/runtime');
const { profileEnvSchema } = require('../../services/config/schema');
const toolRegistry = require('../../data/aiToolRegistry');
const secretProviders = require('../../data/secretProviders');

async function fetchBotAvatarUrl() {
  const credentials = createLegacyConfig(process.env);
  if (!credentials.bot.token) return null;
  const rest = new REST({ version: '10' }).setToken(credentials.bot.token);
  const userData = await rest.get(Routes.user('@me'));
  return new User({ rest }, userData).displayAvatarURL({ extension: 'png', size: 128 });
}

function queryFilters(query) {
  return Object.fromEntries(Object.entries(query).filter(([, value]) => value !== ''));
}

function createApi(database, port, { onSecretsChanged = () => {} } = {}) {
  const router = express.Router();
  const profile = getProfile();
  const configs = createConfigStore(database);
  const secrets = createSecretStore(database);
  const actor = createLegacyConfig(process.env).owner.id;
  function assertActiveProfile(value) {
    if (profileEnvSchema.parse(value) !== profile) {
      const error = new Error('This dashboard can only access its configured bot.');
      error.status = 404;
      throw error;
    }
  }
  router.use((request, response, next) => withLogContext({ component: 'dashboard-api' }, next));
  router.use((request, response, next) => {
    response.set('Cache-Control', 'no-store');
    response.set('X-Content-Type-Options', 'nosniff');
    next();
  });
  router.use(createOriginCheck(port));
  router.use(express.json({ limit: '128kb' }));
  router.use((request, response, next) => {
    request.actor = actor;
    next();
  });

  router.get('/profiles', async (request, response) => {
    const [status, avatarUrl] = await Promise.all([
      requestBot(profile),
      fetchBotAvatarUrl().catch(() => null),
    ]);
    if (avatarUrl) configs.updateProfileImageUrl(profile, avatarUrl);
    response.json({
      profile,
      profiles: configs.listProfiles().filter((item) => item.env === profile),
      status: { [profile]: status },
    });
  });
  router.get('/catalog', (request, response) =>
    response.json({
      tools: toolRegistry,
      secretProviders: [
        ...secretProviders.map(({ id, label, group }) => ({ value: id, label, group })),
        ...new Map(
          configs.read(profile).ai.customProviders.map((provider) => [
            provider.id,
            { value: provider.id, label: provider.name, group: 'AI providers' },
          ])
        ).values(),
      ],
    })
  );
  router.get('/profiles/:env/config', (request, response) => {
    assertActiveProfile(request.params.env);
    response.json({ config: configs.read(profile) });
  });
  router.patch('/profiles/:env/config', async (request, response) => {
    assertActiveProfile(request.params.env);
    const saved = configs.patch(profile, request.body, request.actor);
    const application = await notifyBots([profile]);
    response.json({ ...saved, application });
  });
  router.post('/profiles/:env/apply', async (request, response) => {
    assertActiveProfile(request.params.env);
    response.json({ application: await notifyBots([profile]) });
  });
  router.get('/secrets', (request, response) => response.json({ secrets: secrets.list() }));
  router.post('/secrets/:id/edit', (request, response) =>
    response.json({ secret: secrets.readForEdit(request.params.id) })
  );
  router.post('/secrets', async (request, response) => {
    const secret = secrets.add(request.body, request.actor);
    onSecretsChanged();
    response.status(201).json({ secret, application: await notifyBots([profile]) });
  });
  router.patch('/secrets/:id', async (request, response) => {
    const secret = secrets.replace(request.params.id, request.body, request.actor);
    onSecretsChanged();
    response.json({ secret, application: await notifyBots([profile]) });
  });
  router.delete('/secrets/:id', async (request, response) => {
    secrets.remove(request.params.id, request.actor);
    onSecretsChanged();
    response.json({ application: await notifyBots([profile]) });
  });
  router.post('/secrets/:id/test', async (request, response) => {
    const secret = secrets.readForTest(request.params.id);
    const options = z
      .strictObject({ allowGeneration: z.boolean().optional() })
      .parse(request.body || {});
    if (request.query.profile !== undefined) assertActiveProfile(request.query.profile);
    const customProvider = configs
      .read(profile)
      .ai.customProviders.find((provider) => provider.id === secret.provider);
    const result = await checkKey(secret, { ...options, customProvider });
    if (!result.tested) return response.json(result);
    const recorded = secrets.recordTest(request.params.id, request.actor, result.success, secret);
    if (!recorded)
      return response.json({
        success: false,
        tested: false,
        message: 'The key changed during the check. Check the current key again.',
      });
    response.json(result);
  });
  router.get('/history', (request, response) => {
    const filters = queryFilters(request.query);
    delete filters.profile;
    filters.env = profile;
    filters.includeShared = true;
    response.json(configs.listHistory(filters));
  });
  router.get('/history/:id', (request, response) => {
    const result = configs.historyDetail(request.params.id);
    if (!result || ![profile, 'shared'].includes(result.event.env))
      return response.status(404).json({ error: 'Activity entry was not found.' });
    response.json(result);
  });
  router.get('/profiles/:env/logs', (request, response) => {
    assertActiveProfile(request.params.env);
    response.json(readLogs(profile, queryFilters(request.query)));
  });
  router.use((request, response) =>
    response.status(404).json({ error: 'API route was not found.' })
  );
  router.use((error, request, response, next) => {
    if (response.headersSent) return next(error);
    const invalid =
      error.name === 'ZodError' ||
      error.status === 400 ||
      error.statusCode === 400 ||
      error.type === 'entity.parse.failed';
    const notFound = error.status === 404 || error.statusCode === 404;
    const oversized = error.type === 'entity.too.large';
    if (!invalid && !notFound && !oversized)
      console.error('Dashboard request failed', {
        component: 'dashboard-api',
        operation: `${request.method} ${request.route?.path || 'unknown'}`,
        error,
      });
    response.status(oversized ? 413 : invalid ? 400 : notFound ? 404 : 500).json({
      error: oversized
        ? 'Request is too large.'
        : invalid
          ? 'Invalid settings or filters. Check the values and try again.'
          : notFound
            ? 'This dashboard can only access its configured bot.'
            : 'The operation could not be completed. Check application logs.',
      ...(error.name === 'ZodError'
        ? {
            issues: error.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.code,
            })),
          }
        : {}),
    });
  });
  return router;
}

module.exports = { createApi, fetchBotAvatarUrl };
