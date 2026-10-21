# Local Hellbot dashboard

The dashboard manages the single Hellbot bot installed alongside it through a
React, Vite and Mantine interface backed by an Express API and SQLite. `NODE_ENV`
determines which bot this installation can access: local development uses the
Development Discord app, while the VPS production install uses the Production
Discord app. There is no profile switcher; the API rejects requests for the other
profile. Each installation uses its own database outside the checkout.

## Setup

Install dependencies, initialize SQLite, import initial configuration, and set up
the local dashboard environment:

```sh
npm install
npm run db:migrate
npm run config:import -- --profile dev --dry-run
npm run config:import -- --profile dev --apply
npm run dashboard:setup
```

Use `--profile prod` for the production VPS setup instead. Import only the
profile selected for that installation.

The import is explicit and skips profiles that already have configuration. It does
not start a bot or overwrite stored profiles. The database defaults to
`~/.local/share/hellbot/hellbot-db`; see [database setup](database.md).

Set a stable `HELLBOT_ENCRYPTION_KEY` in the environment for dashboard and bot
processes. It must be a base64-encoded 32-byte key. Never rotate or replace it
without re-encrypting the stored API credentials. The setup command can generate
a local development value; production processes must share the same key.

## Local development

Start the dashboard API and Vite together:

```sh
npm run dashboard:dev
```

Open `http://127.0.0.1:5173`. The launcher starts both processes and stops them
together when interrupted. The API listens on loopback, defaults to port 3001,
and Vite proxies `/api` to it. Starting Vite alone leaves API requests unavailable.

For a production-style local preview, build and serve the static dashboard:

```sh
npm run dashboard:build
npm run dashboard:start
```

The Express server serves the bundle and API on `127.0.0.1:3001` by default. Set
`DASHBOARD_PORT` to change the port. `HELLBOT_DASHBOARD_DEV=true` is reserved for
the combined development launcher.

## Access

The single-owner dashboard opens without login, passwords, sessions or cookies.
The API binds to loopback. Browser mutations must include the expected local origin
and dashboard request header. Production access is through the owner's Tailscale
network at `https://openclaw-vps.tailbfe083.ts.net:8443`. Tailscale Serve proxies
that private HTTPS endpoint to `127.0.0.1:3001`; it is not exposed publicly. Set
`HELLBOT_DASHBOARD_ORIGIN` to that exact HTTPS origin. Local startup does not change
VPS services or Tailscale routing.

## Environment and live configuration

`NODE_ENV=development` selects Development; `NODE_ENV=production` selects
Production. `npm run dashboard:dev`, `npm run dev`, and `npm run bot:dev` set
development mode. `npm run dashboard:start` and `npm run bot:prod` set production
mode. The dashboard displays the selected environment but cannot switch it. The
development credentials are
`DEV_DISCORD_TOKEN` and `DEV_CLIENT_ID`; production uses `DISCORD_TOKEN` and
`CLIENT_ID`. Discord tokens, application keys, public keys, the database path,
encryption key and Bugsnag startup key remain environment settings.

The bot loads its validated profile and credentials from this installation into an in-memory
snapshot at startup. Saving a profile change writes SQLite and activity history,
then sends the active bot one local IPC reload notification. API key changes
notify only the active bot. The bot atomically swaps the snapshot and refreshes runtime consumers;
if applying fails, the previous valid snapshot remains active. Saved and applied
status are reported separately. There is no database polling and no per-command
configuration query.

Bot settings expose Hellbot's server routing IDs for home/testing servers,
verification, general, update, creation, photo and log channels, the Minecraft
category, verified role, and staff notification role. The role-request form also
configures its request/review channels and anchor role ID. These IDs are profile
specific, validated as Discord snowflakes, stored in SQLite, and included in
activity history. Migration 002 fills absent IDs using existing values without
overwriting saved profile configuration. Runtime consumers read the current
snapshot for subsequent operations. The log channel ID currently has no consumer;
Errors & logs reads local structured logs independently. A changed target guild
also affects future role requests and server tool access. Existing operations may
finish with the values they already read. Slash-command registration is an explicit
operation.

Bot settings list the active bot's servers using Discord.js REST with its configured
token. The dashboard fetches all pages on the first load and saves the complete list
and refresh time per profile in SQLite (migration 003). Later visits use the saved
list, including while the bot process is stopped. Use **Refresh** to fetch
the current list from Discord. Failed refreshes keep the previous saved list.
Each guild can be enabled or disabled independently. The disabled guild ID list is
profile configuration stored in SQLite and applied through the normal IPC reload.
Disabled guilds cannot invoke slash or prefix commands, trigger guild workflows, or
receive scheduled guild broadcasts. The bot remains installed in those servers so
the dashboard can continue listing and re-enabling them. Server discovery does not
use bot IPC or open a Gateway connection.

## AI tools and features

AI settings choose a supported provider and model and configure each registered AI
tool per profile. Disabled tools are omitted from requests and rejected before
dispatch, including calls returned by an in-flight conversation. Enabling a tool
does not bypass its existing permission checks.

Feature switches cover mention replies, random replies, role requests, verification,
ticket replies, daily quotes, future news and presence rotation. Timing and behavior
settings include random reply probability, scheduled job cron strings and presence
rotation interval. Job changes reschedule affected tasks. In-flight work may finish
with the values it already captured.

## API keys

Groq, Google Gemini, EdenAI, NewsAPI, ExchangeRate-API and API Ninjas credentials
are shared by Hellbot services within this installation, stored encrypted with
AES-256-GCM, and never included
in list/save responses or activity history. Add, edit, test and delete keys from
**API keys**. Edit loads the current key only on demand into a masked input; its
visibility toggle is controlled by the user. The explicit edit endpoint returns
the value only to prefill that form.

Import existing `.env` credentials without printing their values:

```sh
npm run secrets:import -- --dry-run
npm run secrets:import -- --apply
```

A provider that already has saved keys is skipped. Numbered Gemini keys keep their
numeric order; the unnumbered key is used only if no numbered ones exist. After
import, runtime uses database values only; a key left in `.env` does not return if
it is removed from the dashboard.

The **Test connection** action makes an authenticated provider request. Groq and
Google check model-list endpoints; NewsAPI checks one headline, ExchangeRate-API
checks quota, API Ninjas checks one random quote. EdenAI requires a confirmation
because its check generates a test image and may use provider credits. These
requests run only when explicitly requested. Weather uses Open-Meteo without a key.

## Activity and logs

Activity shows configuration changes for this bot and key operations in this
installation. Secret values are never recorded. Errors & logs shows structured,
redacted application logs for the active bot from the `application_logs` SQLite table.
Records expire after seven days; filtering and pagination run in SQL. This is not
a Bugsnag feed. Bugsnag remains a startup environment integration.

## Discord profile images

Use the sync button next to the bot name in the sidebar to refresh its dashboard
identity. The dashboard API uses discord.js REST with the active bot token to fetch
the Discord user, then saves its display name and avatar URL to the active `profiles`
row. This is a direct REST request from the dashboard process; it does not use
bot-process IPC or start an additional gateway connection. The active profile's
last saved name and image remain in place if Discord cannot be reached.


## Custom AI providers

AI settings can add providers that implement the OpenAI-compatible Chat Completions
API. Add a display name, API base URL (ending in `/v1` when required by the provider),
and model ID. The provider is saved with this installation's configuration and
becomes available in its AI provider selector. Add its API key in the API keys
page; custom-provider keys are encrypted and available to this installation's bot.
Development and production have independent provider entries and keys. This does
not add adapters for provider-specific APIs that are not OpenAI-compatible.

## Deploys

**Workspace → Deploys** reads production runs from this repository's
`.github/workflows/main.yml` on `main` through the GitHub REST API. It shows
workflow status, commit, branch, actor, timestamps, approximate elapsed time,
individual jobs and steps, and job logs loaded on demand. Workflow duration is
measured from GitHub's run start to its last update, so it can include waiting
between jobs. Only active workflows refresh automatically, every 15 seconds while
the page is visible. Use **Refresh** to discover a newly started workflow.

Set this variable in the dashboard server's environment:

```dotenv
HELLBOT_GITHUB_TOKEN=<fine-grained GitHub personal access token>
```

Limit the token to this repository and grant **Actions: read**. The token is used
only by the server over HTTPS; it is never returned to the browser or saved in the
configuration database. Without it, the page still shows the verified release
state and explains how to enable history. Restart the dashboard process after
setting or rotating this environment variable. Local development can use its own
read-only token; it reads production workflow history without deploying anything.

Logs come from GitHub, receive additional server-side credential redaction, and
are rendered as plain text. GitHub makes logs available after a job completes;
while it runs, the page shows step progress. Previews are limited to roughly 1 MiB,
with a GitHub link for the complete output. Deleted or expired GitHub logs cannot
be recovered here. The dashboard holds only a short, bounded in-memory API cache;
it does not copy the GitHub log archive into SQLite. These are separate from the
bot's application logs already stored in SQLite.

Migration 007 adds `deployment_release` to the existing SQLite database. The
workflow restarts both processes with `DEPLOY_SHA`, then verifies that the
production bot is connected to Discord, the built dashboard and API respond,
and both processes report that revision. Only after these checks does it record
the SHA, workflow run ID, attempt, and verification timestamp in SQLite. The page
shows a live release only when both running processes still report the recorded
revision. A Git checkout or a green GitHub workflow alone does not establish that
release state. Existing deployments have no marker until the next successful
health-verified deploy; manual deploys must use the same verification/recording
step rather than inserting a marker by hand.

Production checkout, dependency installation, build, migrations, restart and
verification are separate workflow steps. Slash registration runs afterward.
Discord notification is a separate **Notify Discord** job, so notification
failure does not turn the **Deploy production** job red. The overall GitHub
workflow may still fail; the page labels that as **Workflow status** and shows
each job's outcome separately, alongside the verified live release.

GitHub API references: [workflow runs](https://docs.github.com/en/rest/actions/workflow-runs)
and [workflow jobs and logs](https://docs.github.com/en/rest/actions/workflow-jobs).
