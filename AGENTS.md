# Hellbot Discord Bot - AI Agent Rules

## Project Overview

Hellbot is a Discord bot built with Node.js and Discord.js v14 (CommonJS). It includes:

- AI replies and tools (Groq, Google Gemini, custom providers; EdenAI for image generation)
- Moderation, role requests, tickets and entertainment commands
- Scheduled jobs (daily quote, future news, presence rotation, update announcements)
- Per-guild AI memory stored as Markdown files
- A web dashboard (Express API + React/Vite/Mantine) that manages the bot's configuration, secrets, logs and AI usage
- SQLite storage (`better-sqlite3`) shared by the bot and dashboard
- GitHub Actions deployment to the production VPS on push to `main`

One installation runs one bot profile. `NODE_ENV=development` selects the dev profile (Development Discord app); anything else selects prod.

Detailed docs live in `docs/`. Read the relevant one before changing that area:

- `docs/dashboard.md`: dashboard setup and operation
- `docs/database.md`: SQLite location, migrations, backups
- `docs/config-inventory.md`: persisted configuration shape
- `docs/ai-memory.md`: AI server memory tools and storage
- `docs/logging.md`: application logs in SQLite

Project skills for the dashboard UI and backend patterns are in `.agents/skills/`.


## Professional Programming Standards

- Write clear, minimal, and efficient code
- Use descriptive names and small, focused functions
- Avoid deep nesting and complex logic
- Separate concerns and keep modules single-purpose
- Handle errors and edge cases gracefully
- Follow the DRY (Don't Repeat Yourself) principle
- Follow the Single Responsibility Principle for all modules
- Use dependency injection where appropriate
- Maintain clear separation between different layers of the application
- Write code that reads like well-written prose


## Code Style & Conventions

### General
- Do not create any tests for new features, commands, or bug fixes.

### JavaScript Style
- Use ES6+ features but maintain CommonJS require/module.exports structure
- Use camelCase for variables and functions
- Use PascalCase for class names and constructors
- Use UPPER_SNAKE_CASE for constants and environment variables
- Always use semicolons
- Use template literals for string interpolation
- Prefer const over let, avoid var
- Use async/await over Promises when possible

### Discord.js Patterns
- Commands run from both prefix messages and slash interactions; handle both
- For slash commands use interaction.reply() or interaction.editReply()
- Use deferReply() for operations that take longer than 3 seconds
- Check permissions before executing moderation commands
- Always handle errors gracefully with try/catch blocks
- Use embeds for rich message formatting with `embedColor` from config

### File Organization
- Commands go in `src/commands/` (every `.js` file except `index.js` is auto-loaded)
- Slash command registration is built from commands with `slash: true` in `src/commands/slashCommands/`
- Utilities go in `src/utils/`
- Services go in `src/services/` (AI, config, database, logging, ipc, deployments, memory, ...)
- AI tool implementations go in `src/services/ai-tools/` and are registered in `src/data/aiToolRegistry.js`
- Event listeners go in `src/listeners/`
- Scheduled jobs go in `src/jobs/`
- Constants and static data go in `src/data/`
- Dashboard API is in `src/dashboard/`; the React app is in `dashboard/src/`
- Operational scripts (migrations, imports, deploy) go in `scripts/`
- Database migrations go in `src/services/database/migrations/`

### Configuration and Environment Variables
- Import settings from `src/utils/config.js`. Runtime settings (prefix, embed color, AI provider and models, features, behavior, guild access) come from the profile stored in SQLite and are edited through the dashboard. Do not read them from `process.env`.
- Secrets (AI provider keys, NewsAPI, ExchangeRate-API, API Ninjas) are stored encrypted in SQLite and managed in the dashboard. Numbered environment variables such as `GROQ_API_KEY_1` or `GEMINI_API_KEY_1` are the fallback, and `npm run secrets:import` imports them.
- `DISCORD_TOKEN` and `CLIENT_ID` are the production credentials; `DEV_DISCORD_TOKEN` and `DEV_CLIENT_ID` override them in development. `PUBLIC_KEY` / `PUBLIC_KEY_DEV` are optional.
- `NODE_ENV` selects the profile (`development` = dev, otherwise prod)
- `HELLBOT_DATABASE_PATH`: SQLite file (default `~/.local/share/hellbot/hellbot-db`, never inside the checkout)
- `HELLBOT_ENCRYPTION_KEY`: required stable key for encrypting stored secrets
- `HELLBOT_MEMORY_DIR`, `HELLBOT_LOG_DIR` (legacy log import only), `HELLBOT_IPC_DIR`, `DASHBOARD_PORT`, `HELLBOT_DASHBOARD_ORIGIN`
- `BUGSNAG_API_KEY` enables startup error tracking
- `.env` is gitignored; never commit it


## Architecture Patterns

### Command Structure
Commands receive a single `context`: a Discord.js message (prefix command) or a chat-input interaction (slash command). See `src/commands/ping.js` for the reference shape.

```javascript
module.exports = {
  name: 'commandname',
  description: 'Command description',
  slash: true,
  perm: PermissionFlagsBits.ModerateMembers,
  async execute(context) {
    try {
      if (context.isChatInputCommand?.()) {
        await context.reply('Response');
        return;
      }
      await context.reply('Response');
    } catch (error) {
      console.error('Error in command:', error);
    }
  }
};
```

- `slash: true` exposes the command as a slash command; `perm` restricts it to guild installs with that default permission; `params` declares options
- Run `updateslashcommands` after changing slash command definitions

### Service Integration
- Use `AIservice.js` for all AI-related functionality
- Always validate inputs before sending to AI services
- Handle API rate limits and errors gracefully
- Truncate responses to respect Discord's 2000 character limit

### Error Handling
- Log errors to console with context (console output is captured into the SQLite application logs)
- Use Bugsnag for error tracking in production
- Provide user-friendly error messages
- Never expose sensitive information in error messages


## Discord Bot Best Practices

### Permissions
- Use `hasPermission` and `outranksTarget` from `src/utils/permissions.js`
- Check the invoking member's effective Discord permissions; Discord.js combines grants from all of their roles
- Keep the user's permissions separate from the bot's own permissions and role hierarchy checks
- Owner-only features use the `OWNER` permission from the same module

### Rate Limiting
- Implement cooldowns for heavy operations
- Respect Discord API rate limits
- Use deferReply() for long-running operations

### Security
- Never log or expose `DISCORD_TOKEN`, API keys or the encryption key
- Logs are sanitized (`src/services/logging/redaction.js`); keep secrets out of log context anyway
- Validate all user inputs
- Sanitize data before database operations or file system access
- Use parameterized SQL queries and validate stored configuration with the zod schemas


## AI Integration Guidelines

### Text Generation
- Use `AIservice.usePrompt()` for text generation
- The provider and models come from config (`config.currentAiProvider`, `config.currentAiModel`), not hard-coded values; defaults are in `src/data/aiModels.js` and `src/services/config/defaults.js`
- Provider keys are rotated through `src/utils/apiKeyRotator.js`; do not bypass it
- Always provide proper error handling
- Respect the Discord message length limit (2000 characters)
- Support both text and image inputs

### AI Tools and Memory
- Add tools in `src/services/ai-tools/` and register them in `src/data/aiToolRegistry.js`; tool availability is configurable per profile (`ai.tools`)
- Keep tool responses small to avoid large model inputs
- Memory tools are not available to `freewill`, scheduled jobs or direct messages (see `docs/ai-memory.md`)

### Image Generation
- Use `AIservice.useImageGen()` for image creation (EdenAI)
- Handle API failures gracefully
- Validate image URLs before sending to Discord


## Development Workflow

### Environment Setup
- `npm run dev` runs the bot in development with nodemon; `npm run pmdev` uses PM2
- `npm run db:migrate` initializes or upgrades SQLite
- `npm run config:import -- --profile dev --dry-run` then `--apply` imports initial configuration
- `npm run dashboard:setup` prepares the dashboard; `npm run dashboard:dev` runs it locally; `npm run dashboard:build` / `dashboard:start` are for production
- Keep development and production configuration separate; test commands in the development server before production
- Pushes to `main` deploy to production through `.github/workflows/main.yml`

### File Naming
- Use camelCase for JavaScript files
- Keep filenames descriptive and concise
- Group related functionality in directories
- Use index.js files for clean imports

### Debugging
- Use console.log with descriptive context
- Implement proper error boundaries
- Test slash commands in Discord before deployment
- Verify permissions and roles in the test server


## Dependencies Management
- Keep discord.js updated to latest stable version
- Pin API SDK versions for consistency
- Use exact versions for critical dependencies
- Regularly update security-related packages
