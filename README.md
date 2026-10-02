## Hellbot™ - Discord Bot

### Project Overview
This project is a Discord bot built using Node.js and the Discord.js library. It includes various commands and features that enhance user interaction within Discord servers.

### Features
- **AI**: Implements AI API for generating text and image responses.
- **Slash Commands**: Implements DiscordJS slash commands.
- **Scheduled Jobs**: Implements cron jobs for things like daily facts.new members.

### How to run:
- pnpm install
- pnpm install nodemon
- pnpm run dev

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
