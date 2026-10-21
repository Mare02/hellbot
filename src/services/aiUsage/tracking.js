const { AsyncLocalStorage } = require('node:async_hooks');
const { randomUUID } = require('node:crypto');
const { initializeRuntimeConfig } = require('../config/runtime');

const callContext = new AsyncLocalStorage();
const MAX_CAPTURE_BYTES = 1024 * 1024;

function withAiCallContext(context, callback) {
  return callContext.run({ ...callContext.getStore(), ...context }, callback);
}

function parseBody(body) {
  if (body === undefined || body === null) return null;
  if (typeof body !== 'string') return '[Non-text request body]';
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

async function captureResponse(response) {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const available = MAX_CAPTURE_BYTES - length;
      chunks.push(Buffer.from(value.subarray(0, available)));
      length += value.length;
      if (length > MAX_CAPTURE_BYTES) {
        void reader.cancel().catch(() => {});
        return {
          truncated: true,
          limitBytes: MAX_CAPTURE_BYTES,
          preview: Buffer.concat(chunks).toString('utf8'),
        };
      }
    }
    return parseBody(Buffer.concat(chunks).toString('utf8'));
  } finally {
    reader.releaseLock();
  }
}

function errorDetails(error) {
  return {
    name: error?.name || 'Error',
    message: error?.message || 'The request failed.',
    code: error?.code || error?.cause?.code,
    status: error?.status,
  };
}

// Wrap the transport so retries and tool-loop follow-ups each have a separate record.
function createTrackedFetch(defaults) {
  return async (input, options = {}, metadata = {}) => {
    const context = { ...defaults, ...callContext.getStore(), ...metadata };
    const started = Date.now();
    const request = parseBody(options.body);
    const runId = context.runId || randomUUID();
    let store;
    let id;
    try {
      const runtime = initializeRuntimeConfig();
      store = runtime.aiUsage;
      id = store.start({
        runId,
        profile: runtime.profile,
        provider: context.provider,
        model: request?.model || context.model || null,
        operation: context.operation,
        endpoint: String(input),
        method: options.method || 'GET',
        attempt: context.attempt || 1,
        startedAt: new Date(started).toISOString(),
        requestHeaders: Object.fromEntries(new Headers(options.headers)),
        request,
      });
    } catch {
      console.warn('AI call logging could not start.', { component: 'ai-api' });
    }

    function finish(result) {
      const durationMs = Date.now() - started;
      if (id) {
        try {
          store.finish(id, { ...result, completedAt: new Date().toISOString(), durationMs });
        } catch {
          console.warn('AI call details could not be saved.', { component: 'ai-api', callId: id });
        }
      }
    }

    let response;
    try {
      response = await fetch(input, options);
    } catch (error) {
      finish({ outcome: 'error', statusCode: null, error: errorDetails(error) });
      throw error;
    }

    let body;
    let captureError;
    try {
      body = await captureResponse(response.clone());
    } catch (error) {
      body = { captureError: 'The response body could not be captured.' };
      captureError = errorDetails(error);
    }
    finish({
      outcome: response.ok && !captureError ? 'success' : 'error',
      statusCode: response.status,
      responseHeaders: Object.fromEntries(response.headers),
      response: body,
      error:
        captureError ||
        (response.ok
          ? null
          : {
              name: 'HttpError',
              message: `Provider returned HTTP ${response.status}.`,
              status: response.status,
            }),
    });
    return response;
  };
}

module.exports = { createTrackedFetch, withAiCallContext };
