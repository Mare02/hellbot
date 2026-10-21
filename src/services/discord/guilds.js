const { REST, Routes } = require('discord.js');
const { z } = require('zod');
const { createLegacyConfig } = require('../config/legacyConfig');

const PAGE_SIZE = 200;
const guildPageSchema = z.array(
  z.object({
    id: z.string().regex(/^\d{1,20}$/),
    name: z.string().min(1).max(100),
  })
);

async function fetchBotGuilds() {
  const credentials = createLegacyConfig(process.env);
  if (!credentials.bot.token) throw new Error('The active Discord bot token is not configured.');
  const rest = new REST({ version: '10' }).setToken(credentials.bot.token);
  const guilds = new Map();
  let after = '0';

  while (true) {
    const query = new URLSearchParams({ limit: String(PAGE_SIZE), after });
    const result = guildPageSchema.safeParse(await rest.get(Routes.userGuilds(), { query }));
    if (!result.success) throw new Error('Discord returned an invalid server list.');
    const page = result.data;
    for (const guild of page) guilds.set(guild.id, guild);
    if (page.length < PAGE_SIZE) break;
    const next = page.reduce(
      (largest, guild) => BigInt(guild.id) > BigInt(largest) ? guild.id : largest,
      after
    );
    if (BigInt(next) <= BigInt(after)) throw new Error('Discord server pagination did not advance.');
    after = next;
  }

  return [...guilds.values()].sort((left, right) => left.name.localeCompare(right.name));
}

module.exports = { fetchBotGuilds };
