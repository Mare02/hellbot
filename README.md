## Hellbot™ - Discord Bot

### Project Overview
This project is a Discord bot built using Node.js and the Discord.js library. It includes various commands and features that enhance user interaction within Discord servers.

### Features
- **AI**: Implements AI API for generating text and image responses.
- **Server memory**: Saves guild notes on explicit requests, with separate development and production storage. See [AI server memory](docs/ai-memory.md).
- **Slash Commands**: Implements DiscordJS slash commands.
- **Scheduled Jobs**: Implements cron jobs for things like daily facts.new members.

### How to run

Install dependencies and configure bot and AI provider credentials in `.env`:

```sh
pnpm install
```

Start development mode:

```sh
NODE_ENV=development pnpm run dev
```

Start production mode:

```sh
NODE_ENV=production pnpm start
```

`NODE_ENV` selects the bot credentials, command prefix, and memory environment.
The dev script starts nodemon; it does not set `NODE_ENV` itself.

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

Configure numbered keys in `.env`:

```env
AI_PROVIDER=google
GEMINI_API_KEY_1=your-first-key
GEMINI_API_KEY_2=your-second-key
```

Every Gemini HTTP request uses the next key, including retries and tool follow-ups.
Keys rotate in numeric order and wrap back to the first key. Empty entries are
ignored. If no numbered keys are configured, `GEMINI_API_KEY` is used as a fallback.
Restart the bot after changing keys; each process maintains its own rotation.

The shared utility can be used by other services with their own environment prefix:

```javascript
const { createApiKeyRotator } = require('./src/utils/apiKeyRotator');
const apiKeys = createApiKeyRotator('OTHER_API_KEY');
const nextKey = apiKeys.next();
```
