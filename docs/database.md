# Hellbot SQLite foundation

The dashboard database is shared by the development and production bot profiles.
The SQLite driver (`better-sqlite3`) is pinned in `package.json`.

## Location

The default database file is outside the repository:

```text
~/.local/share/hellbot/config.sqlite
```

To override it, set an absolute file path in `.env` or the process environment:

```dotenv
HELLBOT_DATABASE_PATH=/absolute/persistent/directory/config.sqlite
```

The parent directory is created when necessary. Paths inside this checkout,
including symlinks resolving into it, are rejected. All processes sharing the
database must use the same path and have access to its parent directory, including
the SQLite `-wal` and `-shm` files.

## Initialization and migrations

Run from the repository root:

```sh
npm run db:migrate
```

This command loads `.env`, opens the database, applies pending migrations, and
closes the connection. It does not start a Discord client or import configuration
or API keys. Repeating it does not reset existing rows or profile names.

Dashboard and bot startup call the same `initializeDatabase()` function before
opening their listeners. Bot startup then requires an imported configuration for
its explicit profile and loads shared keys into its validated RAM snapshot.

Each connection enables foreign keys and uses WAL journaling and a 5000 ms busy
timeout. Migrations run in an immediate transaction: concurrent startup processes
serialize before reading the schema version. Migration failure rolls back the
transaction and aborts initialization; the application does not replace the
database or silently continue with defaults.

## Schema

- `profiles`: integer IDs, unique `dev`/`prod` environments, display names, optional
  avatar URLs, and UTC timestamps. The initial migration inserts Development and
  Production profiles.
- `profile_configs`: one non-secret JSON configuration per profile. Schema
  migrations leave it empty; the explicit task 2 import populates missing rows.
- `secrets`: shared encrypted AI and integration API keys, with multiple rows allowed per provider.
  Populate explicitly with `npm run secrets:import -- --apply` or dashboard key management.
- `config_history`: profile or shared audit events with non-secret snapshots and
  metadata. Imports and subsequent configuration/key operations are recorded transactionally.

The schema uses foreign keys and JSON shape constraints. Timestamps default to
UTC ISO 8601 strings; future write services must update `updated_at` explicitly.
There are no configuration revision counters. SQLite's `PRAGMA user_version`
tracks only the migration version.

## Adding a migration

Add a SQL file under `src/services/database/migrations/` and append its next
sequential version and filename to `MIGRATIONS` in `migrate.js`. Do not modify an
already applied migration. The schema changes and migration version are committed
together. A checkout older than the database schema refuses to initialize it.

See the [architecture plan](plans/hellbot-dashboard.md) for the table definitions
and subsequent configuration work.

## Initial configuration import

Task 2 adds strict Zod validation, per-profile defaults, and an
explicit import. See the [configuration inventory](config-inventory.md) for the
persisted fields, current consumers, and values that remain in environment/code.

```sh
npm run config:import -- --profile all --dry-run
npm run config:import -- --profile all --apply
```

The import skips existing configurations and records initial snapshots in history.
It does not import API keys, start a bot, or activate database-backed runtime reads.

For runtime behavior, encrypted-key setup and the dashboard, see
[local dashboard operation](dashboard.md). Bot startup reads already imported
settings; it never runs the import command automatically.

## Discord routing backfill (migration 002)

Adds missing guild/channel/category/role ID fields to existing profile JSON using
the previous constants. Existing values are preserved. Each changed profile gets a
`config_migrated` history entry with its snapshot and added paths. New imports
include these fields directly; old history snapshots remain readable.

## AI provider calls (migration 004)

`ai_api_calls` records each actual outbound provider HTTP attempt, including retry
attempts, as a pending row before dispatch and a success/error row on completion.
Rows contain a run ID, profile, provider/model, operation, timestamps, elapsed time,
HTTP status, sanitized endpoint and request/response headers and bodies, and
provider-reported token counts. The request/response records include prompts,
messages, tool arguments/results and generated content. They are available only
through the active profile's dashboard API. Failed requests with no response
usage have unknown token counts, rather than an invented zero-token measurement.
Cached and reasoning tokens are subsets of input/output usage, so totals do not
add them a second time. Native Gemini thinking counts are included in output.

Call records and their bodies expire after 30 days. Cleanup runs when the store
opens and at most hourly during store operations; expired rows are excluded from
reads immediately. A stopped application does not run background cleanup.
Individual bodies are bounded to 256 KiB of sanitized JSON, individual strings
to 256 Ki characters, and nested objects/arrays to bounded depth and item counts.
Truncated records include an explicit marker. No price or billing calculation is
stored.

The transport captures at most 1 MiB of each response before returning it to the
existing provider client. Larger responses keep a marked preview; the original
response is still available to the client. If a response cannot be captured or
does not include usage, its unavailable token counts are not estimated.

The active profile API exposes `GET /profiles/:env/ai-usage` for totals and daily
UTC series, `GET /profiles/:env/ai-calls` for paginated metadata and
`GET /profiles/:env/ai-calls/:id` for the sanitized payload detail. Summary/list
filters include ISO date-time `from`/`to`, `provider` and `model`; list also accepts
`outcome`, `page` and `pageSize` (1–100). The default date window is the last 30 UTC
calendar days including today. Ranges are limited to 366 days and daily summary
series include zero-use days. Records older than retention remain unavailable
even when a broader range is selected. `missingUsageCalls` counts successful
chat completion calls missing any input, output or total token count. Provider
options cover the selected range/profile, and model options additionally respect
the selected provider, so selecting an option does not hide its siblings.
