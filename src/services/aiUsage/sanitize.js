const { createRedactor } = require('../logging/redaction');

const SENSITIVE_FIELD =
  /^(?:.*(?:api[-_]?key|password|passwd|secret|authorization|cookie|credential).*|(?:access|refresh|id|auth|session)[-_]?token|token|keys?|private[-_]?key)$/i;
const SENSITIVE_ENV_FIELD =
  /(?:^|[-_])(?:api[-_]?key|token|password|secret|authorization|cookie)(?:$|[-_])/i;
const MAX_PAYLOAD_BYTES = 256 * 1024;

function createPayloadSanitizer(secretProvider) {
  const redactor = createRedactor(secretProvider, { maxStringLength: MAX_PAYLOAD_BYTES });

  function sanitize(value, depth = 0, visited = new WeakSet()) {
    if (depth >= 16) return '[truncated: maximum nesting]';
    if (typeof value === 'string') {
      // Tool arguments and provider error bodies often contain JSON inside strings.
      if (/^\s*[\[{]/.test(value) && depth < 16) {
        try {
          return JSON.stringify(sanitize(JSON.parse(value), depth + 1, visited));
        } catch (error) {
          // Non-JSON strings still receive exact-value and credential redaction.
        }
      }
      return redactor.text(value);
    }
    if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
    if (value === undefined) return null;
    if (typeof value !== 'object') return redactor.text(String(value));
    if (visited.has(value)) return '[circular]';
    visited.add(value);
    if (Buffer.isBuffer(value)) return `[buffer: ${value.length} bytes]`;
    if (Array.isArray(value)) {
      const items = value.slice(0, 1000).map((child) => sanitize(child, depth + 1, visited));
      if (value.length > 1000) items.push('[truncated: additional items]');
      return items;
    }
    const result = Object.create(null);
    const entries = Object.entries(value);
    for (const [key, child] of entries.slice(0, 1000)) {
      result[redactor.text(key)] =
        SENSITIVE_FIELD.test(key) || SENSITIVE_ENV_FIELD.test(key)
          ? '[REDACTED]'
          : sanitize(child, depth + 1, visited);
    }
    if (entries.length > 1000) result._truncated = 'Additional properties omitted';
    return result;
  }

  return (value) => {
    redactor.refreshSecrets();
    const result = sanitize(value);
    const json = JSON.stringify(result);
    if (Buffer.byteLength(json, 'utf8') <= MAX_PAYLOAD_BYTES) return result;
    return {
      _truncated: `Payload exceeded ${MAX_PAYLOAD_BYTES} bytes; showing sanitized JSON preview`,
      preview: Buffer.from(json)
        .subarray(0, MAX_PAYLOAD_BYTES / 2)
        .toString('utf8'),
    };
  };
}

module.exports = { createPayloadSanitizer };
