# Local application logs

Hellbot stores structured JSONL logs separately from the configuration database. Nothing is written and `console` is not patched by importing `src/services/logging`; startup explicitly installs the capture.

## Storage and limits

- Default directory: `~/.local/share/hellbot/logs`.
- `HELLBOT_LOG_DIR` overrides it with an absolute directory outside the repository, including after resolving symlinks.
- Each profile (`dev`, `prod`, or `dashboard`) has one current file, such as `dev.jsonl`, and up to four rotated files, `dev.1.jsonl` through `dev.4.jsonl`.
- Each file is limited to **5 MiB**. The total limit is **25 MiB per profile**, or **75 MiB** for all three profiles.
- Each record is limited to **32 KiB**; long strings, deeply nested context, and oversized context are truncated.
- Dashboard queries show at most **7 days** of records. Files with no writes in 7 days are deleted during the next write, with cleanup checked at most hourly. Mixed-age files disappear through size rotation; individual expired records are excluded from reads. No background polling or cleanup timer is started. Old files for a permanently stopped profile remain on disk within the same fixed size budget.
- New directories use mode `0700`, files `0600`. Log files must be regular files; file symlinks are rejected.
- Use one writer process for each bot profile. The dashboard writes to its own profile. A second bot process using the same profile must not be run alongside the original.

Writes are synchronous and short so records are serialized in each process. Reads inspect only the five known files and at most 5 MiB per file. A partially written final line or malformed JSON record does not prevent reading other entries.

## API and integration

```javascript
const { installConsoleLogging, createLogger, withLogContext, readLogs } = require('./services/logging');

const cleanup = installConsoleLogging({
  profile: 'dev',
  component: 'bot',
  secretProvider: () => [] // Supply current decrypted AI keys synchronously.
});

const logger = createLogger({ profile: 'dev', component: 'ai' });
logger.error('AI request failed', { error, command: 'askai' });

await withLogContext({ component: 'commands', command: 'askai' }, async () => {
  // Existing console.log/info/warn/error/debug calls inherit this context.
});

const page = readLogs('dev', { level: 'error', page: 1, pageSize: 50 });
// Call cleanup() at shutdown to restore the original console methods.
```

Entries contain `timestamp`, `level`, `profile`, `component`, `message`, optional `command`, and optional structured `context`. Error values preserve their safe name, message, stack, code/status, and nested cause. Console output uses the same sanitized structured record as file storage. Logging failures report a fixed message; they never retry with raw arguments.

`readLogs(profile, filters)` supports exact `level` (`debug`, `info`, `warn`, `error`), `component`, and `command` filters, ISO date-time `from`/`to`, `page` (1–100000), and `pageSize` (1–100, default 50). Results are newest first and return `{ items, total, page, pageSize }`. Unknown or invalid filters throw an error with status `400` and code `INVALID_LOG_FILTER`. Missing log files return an empty page. File access/configuration errors remain errors rather than being presented as an empty log feed.

## Secret and content handling

Redaction happens before persistence and console output, and again before returning dashboard entries. It covers environment values whose variable names contain key/token/password/secret/authorization/cookie, known provider and Discord token formats, credential-shaped text, URL credentials, and decrypted AI keys supplied by `secretProvider`. Providers must be synchronous; failure to retrieve their current values drops the record instead of exposing its input. Previously observed key values remain redacted for the lifetime of a logger.

Sensitive nested properties are replaced with `[REDACTED]`. HTTP request/response bodies, message objects, prompt/content fields, attachments, buffers and unrecognized SDK error payloads are not collected. Do not intentionally log Discord chat text or AI prompts as plain messages: the logger cannot infer that arbitrary text represents private chat content. Prefer operation names, provider/model, command, status and safe identifiers.

The console wrapper catches the application's existing `console.log`, `info`, `warn`, `error`, and `debug` calls. It does not intercept direct stdout/stderr writes, PM2's own logs, or arbitrary third-party file loggers. Unhandled errors should pass through the explicit startup error handler to be included in this feed.

## Bugsnag boundary

The existing application calls `Bugsnag.start({ apiKey: process.env.BUGSNAG_API_KEY })` during bot startup. A source audit found no explicit `Bugsnag.notify` calls in the application. Existing handled errors generally go through `console.error`; that does not by itself mean Bugsnag receives those errors. Bugsnag's enabled runtime integrations may report unhandled exceptions/rejections according to its SDK behavior and runtime configuration.

The dashboard feed contains **local captured application logs only**. There is no Bugsnag event API integration, import, delivery confirmation, or historical Bugsnag event list in this feature. Bugsnag operates separately, and its own transmitted payloads are not sanitized by this local logging service.

## AI call payload history

AI settings have a separate SQLite-backed API call history. Unlike general
application logs, this explicitly captures sanitized AI request/response bodies,
including messages, prompts, generated content and tool arguments/results, plus
HTTP metadata and provider-reported token usage. It expires after 30 days and is
restricted to the active dashboard profile. See `docs/database.md` for limits,
retention and routes.

The AI payload sanitizer preserves content fields while redacting credentials in
nested objects, JSON-encoded strings, headers and endpoint URLs. It reuses the
general logger's exact-secret and credential-text redactor, with decrypted keys
supplied at writes and dashboard reads. Failure to retrieve current secrets
fails closed. General application logging continues to omit request/response
bodies and private content; its existing exclusions are unchanged.
