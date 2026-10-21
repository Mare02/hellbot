## Hellbot™ - Discord Bot

### Project Overview
This project is a Discord bot built using Node.js and the Discord.js library. It includes various commands and features that enhance user interaction within Discord servers.

### Features
- **AI**: Implements AI API for generating text and image responses.
- **Server memory**: Saves guild notes on explicit requests, with separate development and production storage. See [AI server memory](docs/ai-memory.md).
- **Slash Commands**: Implements DiscordJS slash commands.
- **Scheduled Jobs**: Implements cron jobs for things like daily facts.new members.

### How to run

Install dependencies and configure Discord credentials in `.env`:

```sh
pnpm install
```

Initialize the database, import initial settings and encrypted AI keys, and configure
the local dashboard using [dashboard setup](docs/dashboard.md). Then start development mode:

```sh
npm run dev
```

Start production mode:

```sh
npm run bot:prod
```

`NODE_ENV` selects the bot profile: `development` runs the Development bot and
`production` runs the Production bot. `npm run dev` and `npm run bot:dev` select
the development Discord credentials; `npm run bot:prod` selects production.
The dev script explicitly selects dev and starts nodemon. Runtime settings and AI
keys are loaded from SQLite; Discord credentials remain in env.

### Dashboard database

Initialize the dashboard SQLite schema with `npm run db:migrate`.
The database defaults to `~/.local/share/hellbot/hellbot-db`; set
`HELLBOT_DATABASE_PATH` for another persistent location outside the repository.
See [database setup](docs/database.md) for migration and startup details.

Import initial non-secret settings for the current installation explicitly with
`npm run config:import -- --profile dev --apply` locally or
`npm run config:import -- --profile prod --apply` on the VPS (omit `--apply` for a
dry run). Existing configurations are preserved. See the
[configuration inventory](docs/config-inventory.md).

### AI server memory

Each guild has its own file in the selected environment:

```text
~/.local/share/hellbot/memory/dev/<guild-id>/memory.md
~/.local/share/hellbot/memory/prod/<guild-id>/memory.md
```

Optionally set `HELLBOT_MEMORY_DIR` in `.env` to change the base directory;
`dev/` or `prod/` is always appended. Missing files start empty and are created
on the first successful save. Old shared files are not imported.

See [AI server memory](docs/ai-memory.md) for permissions, tool behavior,
storage limits, and backups.

### Gemini API key rotation

For the initial import, configure numbered keys in `.env`:

```env
AI_PROVIDER=google
GEMINI_API_KEY_1=your-first-key
GEMINI_API_KEY_2=your-second-key
```

Run `npm run secrets:import -- --apply` to encrypt and import keys for providers
without stored keys in this installation. Numeric order is preserved and empty entries are ignored;
`GEMINI_API_KEY` is the fallback when no numbered keys exist. Thereafter, manage
keys for the current bot installation in the dashboard. Each Gemini HTTP attempt,
including retries and follow-ups, rotates through the current RAM snapshot.
Dashboard changes notify the active bot over IPC and do not require restarting
its Discord connection.

The shared utility can be used by other services with their own environment prefix:

```javascript
const { createApiKeyRotator } = require('./src/utils/apiKeyRotator');
const apiKeys = createApiKeyRotator('OTHER_API_KEY');
const nextKey = apiKeys.next();
```
