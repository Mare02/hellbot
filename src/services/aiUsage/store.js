const { randomUUID } = require('node:crypto');
const { z } = require('zod');
const { profileEnvSchema } = require('../config/schema');
const { createPayloadSanitizer } = require('./sanitize');

const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_MS = 30 * DAY_MS;
const filterSchema = z.strictObject({
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
  provider: z.string().min(1).max(100).optional(),
  model: z.string().min(1).max(200).optional(),
  outcome: z.enum(['pending', 'success', 'error']).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
const METADATA_SELECT = `c.id, c.run_id AS runId, c.provider, c.model, c.operation,
  c.attempt, c.started_at AS startedAt, c.completed_at AS completedAt,
  c.duration_ms AS durationMs, c.status_code AS statusCode, c.outcome,
  c.input_tokens AS inputTokens, c.output_tokens AS outputTokens,
  c.total_tokens AS totalTokens, c.cached_tokens AS cachedTokens,
  c.reasoning_tokens AS reasoningTokens`;

function tokenCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function normalizeUsage(response) {
  const usage = response?.usage || response?.usageMetadata || {};
  const inputTokens = tokenCount(usage.prompt_tokens ?? usage.promptTokenCount);
  const reasoningTokens = tokenCount(
    usage.completion_tokens_details?.reasoning_tokens ?? usage.thoughtsTokenCount
  );
  let outputTokens = tokenCount(usage.completion_tokens ?? usage.candidatesTokenCount);
  // Native Gemini reports thinking separately; OpenAI completion tokens already include it.
  if (!response?.usage && reasoningTokens !== null) {
    outputTokens = (outputTokens ?? 0) + reasoningTokens;
  }
  const totalTokens =
    tokenCount(usage.total_tokens ?? usage.totalTokenCount) ??
    (inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null);
  return {
    inputTokens,
    outputTokens,
    totalTokens,
    cachedTokens: tokenCount(
      usage.prompt_tokens_details?.cached_tokens ?? usage.cachedContentTokenCount
    ),
    reasoningTokens,
  };
}

function withUsage(row) {
  return {
    ...row,
    hasUsage: row.inputTokens !== null || row.outputTokens !== null || row.totalTokens !== null,
  };
}

function createAiUsageStore(database, { secretProvider = () => ({}) } = {}) {
  const sanitize = createPayloadSanitizer(secretProvider);
  const serialize = (value) => JSON.stringify(sanitize(value));
  const profileId = database.prepare('SELECT id FROM profiles WHERE env = ?');
  const insert = database.prepare(`
    INSERT INTO ai_api_calls (
      id, run_id, profile_id, provider, model, operation, endpoint, method,
      attempt, started_at, outcome, request_json, request_headers_json
    ) VALUES (@id, @runId, @profileId, @provider, @model, @operation, @endpoint,
      @method, @attempt, @startedAt, 'pending', @request, @requestHeaders)
  `);
  const finishCall = database.prepare(`
    UPDATE ai_api_calls SET completed_at = @completedAt, duration_ms = @durationMs,
      status_code = @statusCode, outcome = @outcome, response_json = @response,
      response_headers_json = @responseHeaders, error_json = @error,
      input_tokens = @inputTokens, output_tokens = @outputTokens,
      total_tokens = @totalTokens, cached_tokens = @cachedTokens,
      reasoning_tokens = @reasoningTokens
    WHERE id = @id AND outcome = 'pending'
  `);
  const removeExpired = database.prepare('DELETE FROM ai_api_calls WHERE started_at < ?');
  let lastCleanup = 0;
  function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < 60 * 60 * 1000) return;
    removeExpired.run(new Date(now - RETENTION_MS).toISOString());
    lastCleanup = now;
  }
  cleanup();

  function filtersFor(profile, input = {}) {
    cleanup();
    const env = profileEnvSchema.parse(profile);
    const filters = filterSchema.parse(input);
    const today = new Date().toISOString().slice(0, 10);
    const from = filters.from
      ? new Date(filters.from).toISOString()
      : new Date(new Date(`${today}T00:00:00.000Z`).getTime() - 29 * DAY_MS).toISOString();
    const to = filters.to ? new Date(filters.to).toISOString() : `${today}T23:59:59.999Z`;
    if (from > to || new Date(to) - new Date(from) > 366 * DAY_MS) {
      const error = new Error('AI usage range must be ordered and at most 366 days.');
      error.status = 400;
      throw error;
    }
    const clauses = [
      'p.env = @profile',
      'c.started_at >= @from',
      'c.started_at <= @to',
      'c.started_at >= @cutoff',
    ];
    const params = {
      profile: env,
      from,
      to,
      cutoff: new Date(Date.now() - RETENTION_MS).toISOString(),
    };
    for (const name of ['provider', 'model', 'outcome']) {
      if (!filters[name]) continue;
      clauses.push(`c.${name} = @${name}`);
      params[name] = filters[name];
    }
    return { filters, from, to, params, where: clauses.join(' AND ') };
  }
  const source = 'FROM ai_api_calls c JOIN profiles p ON p.id = c.profile_id';

  return {
    start(event) {
      cleanup();
      const env = profileEnvSchema.parse(event.profile);
      const profile = profileId.get(env);
      if (!profile) throw new Error('AI call profile was not found.');
      const id = event.id || randomUUID();
      insert.run({
        id,
        runId: event.runId || null,
        profileId: profile.id,
        provider: sanitize(event.provider || 'unknown'),
        model: event.model ? sanitize(event.model) : null,
        operation: sanitize(event.operation || 'chat.completion'),
        endpoint: event.endpoint ? sanitize(event.endpoint) : null,
        method: event.method || 'POST',
        attempt: event.attempt || 1,
        startedAt: new Date(event.startedAt || Date.now()).toISOString(),
        request: serialize(event.request ?? null),
        requestHeaders: serialize(event.requestHeaders ?? null),
      });
      return id;
    },
    finish(id, result) {
      finishCall.run({
        id,
        completedAt: new Date(result.completedAt || Date.now()).toISOString(),
        durationMs: Number.isFinite(result.durationMs)
          ? Math.max(0, Math.round(result.durationMs))
          : null,
        statusCode: result.statusCode ?? null,
        outcome: result.outcome === 'success' ? 'success' : 'error',
        response: serialize(result.response ?? null),
        responseHeaders: serialize(result.responseHeaders ?? null),
        error: serialize(result.error ?? null),
        ...normalizeUsage(result.response),
      });
    },
    summary(profile, input) {
      const { from, to, params, where } = filtersFor(profile, input);
      const totals = database
        .prepare(
          `SELECT COUNT(*) AS calls,
        COALESCE(SUM(outcome = 'success'), 0) AS successfulCalls,
        COALESCE(SUM(outcome = 'error'), 0) AS failedCalls,
        COALESCE(SUM(outcome = 'pending'), 0) AS pendingCalls,
        COALESCE(SUM(input_tokens), 0) AS inputTokens,
        COALESCE(SUM(output_tokens), 0) AS outputTokens,
        COALESCE(SUM(total_tokens), 0) AS totalTokens,
        COALESCE(SUM(cached_tokens), 0) AS cachedTokens,
        COALESCE(SUM(reasoning_tokens), 0) AS reasoningTokens,
        COUNT(cached_tokens) AS cachedUsageCalls,
        COUNT(reasoning_tokens) AS reasoningUsageCalls,
        COALESCE(SUM(outcome = 'success' AND operation = 'chat.completion'
          AND (input_tokens IS NULL OR output_tokens IS NULL OR total_tokens IS NULL)), 0) AS missingUsageCalls
        ${source} WHERE ${where}`
        )
        .get(params);
      const daily = database
        .prepare(
          `SELECT substr(started_at, 1, 10) AS date,
        COUNT(*) AS calls, COALESCE(SUM(input_tokens), 0) AS inputTokens,
        COALESCE(SUM(output_tokens), 0) AS outputTokens,
        COALESCE(SUM(total_tokens), 0) AS totalTokens
        ${source} WHERE ${where} GROUP BY date ORDER BY date`
        )
        .all(params);
      const byDate = new Map(daily.map((row) => [row.date, row]));
      const series = [];
      const finalDay = Date.parse(`${to.slice(0, 10)}T00:00:00.000Z`);
      for (
        let day = Date.parse(`${from.slice(0, 10)}T00:00:00.000Z`);
        day <= finalDay;
        day += DAY_MS
      ) {
        const date = new Date(day).toISOString().slice(0, 10);
        series.push(
          byDate.get(date) || { date, calls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 }
        );
      }
      const catalogWhere =
        'p.env = @profile AND c.started_at >= @from AND c.started_at <= @to AND c.started_at >= @cutoff';
      const catalogParams = { profile: params.profile, from, to, cutoff: params.cutoff };
      const providers = database
        .prepare(`SELECT DISTINCT provider ${source} WHERE ${catalogWhere} ORDER BY provider`)
        .all(catalogParams)
        .map((row) => row.provider);
      const modelWhere = params.provider
        ? `${catalogWhere} AND c.provider = @provider`
        : catalogWhere;
      const modelParams = params.provider
        ? { ...catalogParams, provider: params.provider }
        : catalogParams;
      const models = database
        .prepare(
          `SELECT DISTINCT model ${source} WHERE ${modelWhere} AND c.model IS NOT NULL ORDER BY model`
        )
        .all(modelParams)
        .map((row) => row.model);
      return sanitize({ from, to, totals, series, providers, models });
    },
    list(profile, input) {
      const { filters, params, where } = filtersFor(profile, input);
      const total = database
        .prepare(`SELECT COUNT(*) AS total ${source} WHERE ${where}`)
        .get(params).total;
      const items = database
        .prepare(
          `SELECT ${METADATA_SELECT} ${source} WHERE ${where}
        ORDER BY c.started_at DESC, c.id DESC LIMIT @limit OFFSET @offset`
        )
        .all({ ...params, limit: filters.pageSize, offset: (filters.page - 1) * filters.pageSize })
        .map(withUsage);
      return sanitize({ items, total, page: filters.page, pageSize: filters.pageSize });
    },
    detail(profile, id) {
      cleanup();
      const env = profileEnvSchema.parse(profile);
      const row = database
        .prepare(
          `SELECT ${METADATA_SELECT}, c.endpoint, c.method,
        c.request_json, c.request_headers_json, c.response_json, c.response_headers_json, c.error_json
        ${source} WHERE p.env = ? AND c.id = ? AND c.started_at >= ?`
        )
        .get(env, String(id), new Date(Date.now() - RETENTION_MS).toISOString());
      if (!row) return null;
      const {
        request_json,
        request_headers_json,
        response_json,
        response_headers_json,
        error_json,
        ...metadata
      } = row;
      return {
        ...sanitize(withUsage(metadata)),
        request: sanitize(JSON.parse(request_json)),
        requestHeaders: sanitize(request_headers_json ? JSON.parse(request_headers_json) : null),
        response: sanitize(response_json ? JSON.parse(response_json) : null),
        responseHeaders: sanitize(response_headers_json ? JSON.parse(response_headers_json) : null),
        error: sanitize(error_json ? JSON.parse(error_json) : null),
      };
    },
  };
}

module.exports = { createAiUsageStore };
