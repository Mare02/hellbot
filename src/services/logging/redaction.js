const util = require('node:util');

const REDACTED = '[REDACTED]';
const MAX_STRING_LENGTH = 12000;
const SENSITIVE_FIELD = /key|token|password|secret|authorization|cookie/i;
const PRIVATE_CONTENT_FIELD =
  /^(?:body|request|response|messages|prompt|systemPrompt|content|attachments?)$/i;

function collectSecrets(value, result, visited = new WeakSet()) {
  if (typeof value === 'string' && value.length > 0) {
    result.add(value);
    return;
  }

  if (!value || typeof value !== 'object' || visited.has(value)) {
    return;
  }

  if (typeof value.then === 'function') {
    throw new Error('Log secretProvider must be synchronous.');
  }

  visited.add(value);
  for (const child of Object.values(value)) {
    collectSecrets(child, result, visited);
  }
}

function createRedactor(secretProvider, { maxStringLength = MAX_STRING_LENGTH } = {}) {
  const secrets = new Set();
  for (const [name, value] of Object.entries(process.env)) {
    if (SENSITIVE_FIELD.test(name)) {
      collectSecrets(value, secrets);
    }
  }

  // Refresh on each record so rotated keys are removed from output immediately.
  // Keep previously seen values redacted while older errors are still in flight.
  function refreshSecrets() {
    for (const [name, value] of Object.entries(process.env)) {
      if (SENSITIVE_FIELD.test(name)) {
        collectSecrets(value, secrets);
      }
    }

    if (secretProvider) {
      const provided = secretProvider();
      if (provided && typeof provided.then === 'function') {
        throw new Error('Log secretProvider must be synchronous.');
      }
      collectSecrets(provided, secrets);
    }
  }

  function redactText(value) {
    let text = String(value);
    // Exact values also cover secret formats that do not have a known prefix.
    for (const secret of [...secrets].sort((left, right) => right.length - left.length)) {
      text = text.split(secret).join(REDACTED);
      const encoded = encodeURIComponent(secret);
      if (encoded !== secret) {
        text = text.split(encoded).join(REDACTED);
      }
    }

    text = text
      .replace(/\bBearer\s+[^\s,;'"}]+/gi, `Bearer ${REDACTED}`)
      .replace(/\bBot\s+[A-Za-z0-9._-]{20,}/g, `Bot ${REDACTED}`)
      .replace(/\b(?:gsk_|sk-|AIza)[A-Za-z0-9_-]{16,}/g, REDACTED)
      .replace(/\b(?:mfa\.[\w-]{20,}|[\w-]{23,28}\.[\w-]{6}\.[\w-]{20,})\b/g, REDACTED)
      .replace(
        /((?:api[_-]?key|token|password|secret|authorization|cookie)[\w-]*["']?\s*[:=]\s*["']?)[^\s,;'"}\]]+/gi,
        `$1${REDACTED}`
      )
      .replace(/(https?:\/\/)[^\s/@:]+:[^\s/@]+@/gi, `$1${REDACTED}@`);

    return text.length > maxStringLength ? `${text.slice(0, maxStringLength)} [truncated]` : text;
  }

  function sanitize(value, depth = 0, visited = new WeakSet()) {
    if (typeof value === 'string') {
      return redactText(value);
    }
    if (value === null || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }
    if (value === undefined) {
      return undefined;
    }
    if (typeof value === 'bigint') {
      return value.toString();
    }
    if (typeof value !== 'object') {
      return `[${typeof value}]`;
    }
    if (depth >= 6) {
      return '[truncated]';
    }
    if (visited.has(value)) {
      return '[circular]';
    }

    visited.add(value);
    if (value instanceof Error) {
      const error = {
        name: redactText(value.name),
        message: redactText(value.message),
        stack: typeof value.stack === 'string' ? redactText(value.stack) : undefined,
      };
      // SDK errors can contain complete HTTP requests, prompts and credentials.
      for (const field of ['code', 'status', 'statusCode', 'cause']) {
        if (value[field] !== undefined) {
          error[field] = sanitize(value[field], depth + 1, visited);
        }
      }
      return error;
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? '[invalid date]' : value.toISOString();
    }
    if (Buffer.isBuffer(value)) {
      return `[buffer: ${value.length} bytes]`;
    }
    if (Array.isArray(value)) {
      return value.slice(0, 50).map((item) => sanitize(item, depth + 1, visited));
    }

    const result = {};
    for (const [name, child] of Object.entries(value).slice(0, 50)) {
      const safeName = redactText(name);
      if (SENSITIVE_FIELD.test(name) || PRIVATE_CONTENT_FIELD.test(name)) {
        result[safeName] = REDACTED;
      } else {
        result[safeName] = sanitize(child, depth + 1, visited);
      }
    }
    return result;
  }

  return {
    refreshSecrets,
    sanitize,
    text: redactText,
    format(args) {
      return redactText(
        util.formatWithOptions(
          { depth: 5, maxArrayLength: 50 },
          ...args.map((arg) => sanitize(arg))
        )
      );
    },
  };
}

module.exports = { createRedactor };
