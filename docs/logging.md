# Local application logs

Hellbot stores application logs in the `application_logs` table in the same SQLite database as configuration, history and AI calls. It uses `HELLBOT_DATABASE_PATH` (default: `~/.local/share/hellbot/hellbot-db`). Nothing is written and `console` is not patched by importing `src/services/logging`; startup explicitly installs the capture. Console output keeps its existing behavior.

## Storage and retention

- Migration `005ApplicationLogs.sql` creates the table and indexes for profile, timestamp, level, component and command.
- Each record is limited to **32 KiB**; long strings, deeply nested context, and oversized context are truncated before persistence.
- Dashboard queries show at most **7 days** of records. Writes delete expired rows at most hourly. No cleanup timer is started. SQLite reuses freed pages; cleanup does not automatically shrink the database file.
- All processes use the existing SQLite WAL and busy timeout configuration. Bot logging owns a lazily opened connection; dashboard logging reuses its existing connection. Shutdown closes owned connections.
- Filtering, ordering, counting and pagination execute in SQL. Only the requested page is decoded and sanitized in JavaScript. Case-insensitive literal substring search uses a sanitized lowercase search field; it does not interpret SQL wildcard characters.

New logs are no longer written to JSONL files. Existing files are preserved. To import the last seven days of existing records:

```sh
npm run logs:import
npm run logs:import -- --apply
# Optional source directory:
npm run logs:import -- --directory /absolute/path/to/legacy/logs --apply
```

The importer uses `HELLBOT_LOG_DIR` only to locate legacy files, falling back to `~/.local/share/hellbot/logs`. It reads the existing five filenames per profile, validates and sanitizes records again, and skips already imported records when rerun. Source files are never deleted. Run after stopping old JSONL writers for a consistent final import. New logging does not use `HELLBOT_LOG_DIR`.

## API and integration

```javascript
const { initializeDatabase } = require('./services/database');
const { installConsoleLogging, createLogger, withLogContext, readLogs } = require('./services/logging');
const database = initializeDatabase();

const cleanup = installConsoleLogging({
  database,
  profile: 'dev',
  component: 'bot',
  secretProvider: () => [] // Supply current decrypted AI keys synchronously.
});

const logger = createLogger({ database, profile: 'dev', component: 'ai' });
logger.error('AI request failed', { error, command: 'askai' });

await withLogContext({ component: 'commands', command: 'askai' }, async () => {
  // Existing console.log/info/warn/error/debug calls inherit this context.
});

const page = readLogs('dev', { level: 'error', page: 1, pageSize: 50 }, database);
// At shutdown: logger.close(); cleanup(); database.close();
```

Entries contain `timestamp`, `level`, `profile`, `component`, `message`, optional `command`, and optional structured `context`. Error values preserve their safe name, message, stack, code/status, and nested cause. Console output uses the same sanitized structured record as SQLite storage. Logging failures report a fixed message; they never retry with raw arguments.

`readLogs(profile, filters, database)` supports exact `level` (`debug`, `info`, `warn`, `error`), `component`, and `command` filters, ISO date-time `from`/`to`, `page` (1–100000), and `pageSize` (1–100, default 50). Results are newest first and return `{ items, total, page, pageSize }`. Unknown or invalid filters throw an error with status `400` and code `INVALID_LOG_FILTER`. An empty table returns an empty page. Database errors remain errors rather than being presented as an empty log feed.

## Secret and content handling

Redaction happens before persistence and console output, and again before returning dashboard entries. It covers environment values whose variable names contain key/token/password/secret/authorization/cookie, known provider and Discord token formats, credential-shaped text, URL credentials, and decrypted AI keys supplied by `secretProvider`. Providers must be synchronous; failure to retrieve their current values drops the record instead of exposing its input. Previously observed key values remain redacted for the lifetime of a logger.

Sensitive nested properties are replaced with `[REDACTED]`. HTTP request/response bodies, message objects, prompt/content fields, attachments, buffers and unrecognized SDK error payloads are not collected. Do not intentionally log Discord chat text or AI prompts as plain messages: the logger cannot infer that arbitrary text represents private chat content. Prefer operation names, provider/model, command, status and safe identifiers.

The console wrapper catches the application's existing `console.log`, `info`, `warn`, `error`, and `debug` calls. It does not intercept direct stdout/stderr writes, PM2's own logs, or arbitrary third-party file loggers. Unhandled errors should pass through the explicit startup error handler to be included in this feed.

Scheduled quote and future-news jobs run with `component=jobs` and their feature name as `command`. Each run carries a `jobRunId`; uncaught run failures include the error and duration, while per-guild delivery failures include guild details and a run summary. Presence rotation failures use `command=presenceRotation`. These entries are available through the dashboard Logs page and its component/command filters.

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
