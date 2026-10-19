const { z } = require('zod');
const cron = require('node-cron');
const discordRoutingDefaults = require('../../data/discordRoutingDefaults');
const toolRegistry = require('../../data/aiToolRegistry');

const profileEnvSchema = z.enum(['dev', 'prod']);
const discordIdSchema = z.string().regex(/^[1-9]\d{16,19}$/);
const aiToolsSchema = z.strictObject(
  Object.fromEntries(toolRegistry.map((tool) => [tool.name, z.boolean().default(true)]))
);
const featureDefaults = {
  mentionReplies: true,
  randomReplies: true,
  roleRequests: true,
  verification: true,
  ticketReplies: true,
  dailyQuotes: true,
  futureNews: false,
  presenceRotation: true,
};
const featuresSchema = z.strictObject(
  Object.fromEntries(
    Object.entries(featureDefaults).map(([name, value]) => [name, z.boolean().default(value)])
  )
);
const customProviderSchema = z.strictObject({
  id: z.string().regex(/^custom_[a-z0-9_-]{2,40}$/),
  name: z.string().trim().min(1).max(60),
  baseUrl: z
    .string()
    .url()
    .refine((value) => {
      const url = new URL(value);
      return (
        (url.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(url.hostname)) &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash
      );
    }, 'Use an HTTPS OpenAI-compatible API URL.'),
  model: z.string().trim().min(1).max(200),
});
const cronSchema = z
  .string()
  .min(1)
  .max(100)
  .refine((value) => cron.validate(value), 'Invalid cron schedule.');

const profileConfigSchema = z.strictObject({
  ...Object.fromEntries(
    Object.entries(discordRoutingDefaults).map(([field, value]) => [
      field,
      discordIdSchema.default(value),
    ])
  ),
  commandsPrefix: z.string().min(1).max(32).regex(/^\S+$/),
  embedColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  ai: z.strictObject({
    provider: z.string().regex(/^(groq|google|custom_[a-z0-9_-]{2,40})$/),
    customProviders: z.array(customProviderSchema).max(20).default([]),
    tools: aiToolsSchema.prefault({}),
    models: z.strictObject({
      groq: z.strictObject({
        text: z.string().trim().min(1).max(200),
        vision: z.string().trim().min(1).max(200),
      }),
      google: z.strictObject({ text: z.string().trim().min(1).max(200) }),
    }),
  }),
  features: featuresSchema.prefault({}),
  behavior: z
    .strictObject({
      randomReplyProbability: z.number().min(0).max(1).default(0.05),
      dailyQuoteSchedule: cronSchema.default('0 8 * * *'),
      futureNewsSchedule: cronSchema.default('0 18 * * *'),
      presenceRotationMinutes: z.number().int().min(1).max(35791).default(360),
    })
    .prefault({}),
  roleRequests: z.strictObject({
    requestChannelId: discordIdSchema,
    reviewChannelId: discordIdSchema,
    anchorRoleName: z
      .string()
      .min(1)
      .max(100)
      .refine((value) => Boolean(value.trim()))
      .nullable(),
  }),
});

function parseProfileConfig(env, input) {
  const profile = profileEnvSchema.parse(env);
  const config = profileConfigSchema.parse(input);
  if (
    profile === 'prod' &&
    config.features.roleRequests &&
    !config.roleRequests.anchorRoleName?.trim()
  ) {
    throw new z.ZodError([
      {
        code: 'custom',
        path: ['roleRequests', 'anchorRoleName'],
        message: 'Production role requests require an anchor role name.',
      },
    ]);
  }
  if (
    config.ai.provider.startsWith('custom_') &&
    !config.ai.customProviders.some((provider) => provider.id === config.ai.provider)
  ) {
    throw new z.ZodError([
      {
        code: 'custom',
        path: ['ai', 'provider'],
        message: 'The selected custom provider is not configured.',
      },
    ]);
  }
  if (
    new Set(config.ai.customProviders.map((provider) => provider.id)).size !==
    config.ai.customProviders.length
  ) {
    throw new z.ZodError([
      {
        code: 'custom',
        path: ['ai', 'customProviders'],
        message: 'Custom provider IDs must be unique.',
      },
    ]);
  }
  return config;
}

module.exports = { profileEnvSchema, profileConfigSchema, parseProfileConfig };
