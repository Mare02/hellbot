import {
  Alert,
  Button,
  ColorInput,
  NumberInput,
  Modal,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import { useState } from 'react';
import { IconRefresh } from '@tabler/icons-react';
import { api, dateLabel } from './api';
import { Empty, ResourceState, Section } from './components';
import { useResource } from './useResource';
import AiToolsSection from './AiToolsSection';

const featureLabels = {
  mentionReplies: ['Mention replies', 'Reply when someone mentions the bot.'],
  randomReplies: ['Random replies', 'Occasionally join conversations without a mention.'],
  roleRequests: ['Role requests', 'Allow members to request supported roles.'],
  verification: ['Verification', 'Handle the Hellbot verification workflow.'],
  ticketReplies: ['Ticket replies', 'Enable Hellbot replies inside ticket conversations.'],
  dailyQuotes: ['Daily quotes', 'Publish a quote on the configured schedule.'],
  futureNews: ['Future news', 'Publish generated future news on the configured schedule.'],
  presenceRotation: ['Presence rotation', 'Periodically change the bot presence.'],
};

export function AiSettingsForm({ form, update, fieldError, catalog, modelOptions }) {
  const [providerModal, setProviderModal] = useState(false);
  const [providerName, setProviderName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const customProviders = form.ai.customProviders || [];
  const slug = `custom_${providerName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40)}`;
  const selectedCustomProvider = customProviders.find((item) => item.id === form.ai.provider);

  function addProvider() {
    update('ai.customProviders', [
      ...customProviders,
      {
        id: slug,
        name: providerName.trim(),
        baseUrl: baseUrl.trim().replace(/\/$/, ''),
        model: model.trim(),
      },
    ]);
    update('ai.provider', slug);
    setProviderModal(false);
    setProviderName('');
    setBaseUrl('');
    setModel('');
  }

  return (
    <>
      <Section
        title="Text generation"
        description="Choose the provider and models used by this bot. API keys are shared and managed separately."
      >
        <Select
          label="AI provider"
          data={[
            { value: 'groq', label: 'Groq' },
            { value: 'google', label: 'Google' },
            ...customProviders.map(({ id, name }) => ({ value: id, label: name })),
          ]}
          value={form.ai.provider}
          onChange={(value) => value && update('ai.provider', value)}
          allowDeselect={false}
          error={fieldError('ai.provider')}
        />
        <Button onClick={() => setProviderModal(true)} w="fit-content">
          Add AI provider
        </Button>
        {selectedCustomProvider ? (
          <Stack>
            <Text size="sm" c="dimmed">
              OpenAI-compatible endpoint: {selectedCustomProvider.baseUrl}
            </Text>
            <TextInput
              label="Model ID"
              value={selectedCustomProvider.model}
              onChange={(event) =>
                update(
                  'ai.customProviders',
                  customProviders.map((item) =>
                    item.id === selectedCustomProvider.id
                      ? { ...item, model: event.currentTarget.value }
                      : item
                  )
                )
              }
              error={fieldError('ai.customProviders')}
            />
          </Stack>
        ) : form.ai.provider === 'groq' ? (
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label="Text model"
              value={form.ai.models.groq.text}
              onChange={(event) => update('ai.models.groq.text', event.currentTarget.value)}
              maxLength={200}
              error={fieldError('ai.models.groq.text')}
            />
            <TextInput
              label="Vision model"
              value={form.ai.models.groq.vision}
              onChange={(event) => update('ai.models.groq.vision', event.currentTarget.value)}
              maxLength={200}
              error={fieldError('ai.models.groq.vision')}
            />
          </SimpleGrid>
        ) : (
          <TextInput
            label="Google model"
            value={form.ai.models.google.text}
            onChange={(event) => update('ai.models.google.text', event.currentTarget.value)}
            maxLength={200}
            error={fieldError('ai.models.google.text')}
          />
        )}
        {catalog.error && (
          <Text size="sm" c="red">
            Model catalog could not load.{' '}
            <Button size="compact-xs" variant="subtle" onClick={catalog.refresh}>
              Retry
            </Button>
          </Text>
        )}
      </Section>
      <AiToolsSection enabledTools={form.ai.tools} catalog={catalog} update={update} />
      <Modal opened={providerModal} onClose={() => setProviderModal(false)} title="Add AI provider">
        <Stack>
          <TextInput
            label="Provider name"
            value={providerName}
            onChange={(event) => setProviderName(event.currentTarget.value)}
            maxLength={60}
          />
          <TextInput
            label="OpenAI-compatible API base URL"
            placeholder="https://api.example.com/v1"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.currentTarget.value)}
          />
          <TextInput
            label="Model ID"
            value={model}
            onChange={(event) => setModel(event.currentTarget.value)}
            maxLength={200}
          />
          <Text size="sm" c="dimmed">
            After adding the provider, save settings and add its API key under API keys.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setProviderModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={addProvider}
              disabled={
                !providerName.trim() ||
                !/^custom_[a-z0-9_-]{2,40}$/.test(slug) ||
                !baseUrl.trim() ||
                !model.trim() ||
                customProviders.some((item) => item.id === slug)
              }
            >
              Add provider
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

const discordIdSections = [
  {
    title: 'Servers',
    fields: [
      ['homeServerId', 'Home server ID'],
      ['testingServerId', 'Testing server ID'],
    ],
  },
  {
    title: 'Channels',
    fields: [
      [
        'logChannelId',
        'Log channel ID',
        'Reserved setting; no current bot feature publishes to this channel.',
      ],
      ['verifyChannelId', 'Verification channel ID'],
      ['generalChannelId', 'General channel ID'],
      ['hellbotUpdatesChannelId', 'Hellbot updates channel ID'],
      ['masterCreationsChannelId', 'Master creations channel ID'],
      ['uniqueCreationsChannelId', 'Unique creations channel ID'],
      ['masterPhotosChannelId', 'Master photos channel ID'],
      ['verificationLogsChannelId', 'Verification logs channel ID'],
    ],
  },
  {
    title: 'Categories',
    fields: [['minecraftCategoryId', 'Minecraft category ID']],
  },
  {
    title: 'Roles',
    fields: [
      [
        'staffMemberRoleId',
        'Staff notification role ID',
        'Used for staff notifications only. Command permissions use the member’s effective Discord permissions.',
      ],
      ['verifiedRoleId', 'Verified role ID'],
    ],
  },
];

export function BotSettingsForm({ form, update, fieldError }) {
  const guilds = useResource('/guilds');
  const [guildsSyncing, setGuildsSyncing] = useState(false);
  const [guildsSyncError, setGuildsSyncError] = useState(null);
  const disabledGuildIds = form.disabledGuildIds || [];

  async function syncGuilds() {
    setGuildsSyncing(true);
    setGuildsSyncError(null);
    try {
      await api('/guilds/sync', { method: 'POST', body: {} });
      guilds.refresh();
    } catch (error) {
      setGuildsSyncError(error.message);
    } finally {
      setGuildsSyncing(false);
    }
  }

  return (
    <>
      <Section
        title="Bot appearance"
        description="Settings specific to Hellbot commands and replies."
      >
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label="Command prefix"
            value={form.commandsPrefix}
            maxLength={32}
            onChange={(event) => update('commandsPrefix', event.currentTarget.value)}
            error={fieldError('commandsPrefix')}
          />
          <ColorInput
            label="Embed color"
            format="hex"
            value={form.embedColor}
            onChange={(value) => update('embedColor', value)}
            error={fieldError('embedColor')}
          />
        </SimpleGrid>
      </Section>
      {discordIdSections.map(({ title, fields }) => (
        <Section
          key={title}
          title={title}
          description="IDs apply to this profile. Enable Developer Mode in Discord to copy IDs. Saved changes affect subsequent operations."
        >
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            {fields.map(([name, label, description]) => (
              <TextInput
                key={name}
                label={label}
                description={description}
                value={form[name] ?? ''}
                maxLength={20}
                onChange={(event) => update(name, event.currentTarget.value)}
                error={fieldError(name)}
              />
            ))}
          </SimpleGrid>
        </Section>
      ))}
      <Section
        title="Role request workflow"
        description="Choose where Hellbot receives and reviews role requests. IDs can be copied from Discord with Developer Mode enabled."
      >
        <TextInput
          label="Request channel ID"
          value={form.roleRequests.requestChannelId}
          onChange={(event) => update('roleRequests.requestChannelId', event.currentTarget.value)}
          error={fieldError('roleRequests.requestChannelId')}
        />
        <TextInput
          label="Review channel ID"
          value={form.roleRequests.reviewChannelId}
          onChange={(event) => update('roleRequests.reviewChannelId', event.currentTarget.value)}
          error={fieldError('roleRequests.reviewChannelId')}
        />
        <TextInput
          label="Anchor role name"
          description="Required for production role requests. Leave empty for no anchor in development."
          value={form.roleRequests.anchorRoleName || ''}
          onChange={(event) =>
            update('roleRequests.anchorRoleName', event.currentTarget.value || null)
          }
          error={fieldError('roleRequests.anchorRoleName')}
        />
      </Section>
      <Section
        title="Server access"
        description="Choose which Discord servers can use this bot. Changes are stored with the configuration and apply when you save."
      >
        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            {guilds.data?.syncedAt
              ? `Last refreshed: ${dateLabel(guilds.data.syncedAt)}`
              : 'Load the servers this bot has joined from Discord.'}
          </Text>
          <Button
            variant="default"
            leftSection={<IconRefresh size={16} />}
            loading={guildsSyncing}
            disabled={guilds.loading}
            onClick={syncGuilds}
          >
            Refresh
          </Button>
        </Group>
        {guildsSyncError && (
          <Alert color="yellow" title="Could not refresh servers">
            {guildsSyncError} The last saved server list is kept.
          </Alert>
        )}
        <ResourceState
          {...guilds}
          onRetry={guilds.refresh}
          errorColor="yellow"
          errorTitle="Could not load servers"
          errorMessage="Could not load the server list from Discord. Check this profile's Discord token and connection, then try again."
        />
        {guilds.data &&
          (guilds.data.guilds.length ? (
            <Stack gap="md">
              {guilds.data.guilds.map((guild) => (
                <Group key={guild.id} justify="space-between" wrap="nowrap">
                  <Stack gap={2}>
                    <Text fw={500}>{guild.name}</Text>
                    <Text size="xs" c="dimmed">
                      {guild.id}
                    </Text>
                  </Stack>
                  <Switch
                    aria-label={`Enable Hellbot in ${guild.name}`}
                    checked={!disabledGuildIds.includes(guild.id)}
                    onChange={(event) =>
                      update(
                        'disabledGuildIds',
                        event.currentTarget.checked
                          ? disabledGuildIds.filter((id) => id !== guild.id)
                          : [...disabledGuildIds, guild.id]
                      )
                    }
                  />
                </Group>
              ))}
              {fieldError('disabledGuildIds') && (
                <Text size="sm" c="red">
                  {fieldError('disabledGuildIds')}
                </Text>
              )}
            </Stack>
          ) : (
            <Empty>This bot has not joined any Discord servers.</Empty>
          ))}
      </Section>
    </>
  );
}

export function FeaturesForm({ form, update, fieldError }) {
  return (
    <>
      <Section
        title="Features"
        description="Changes apply to new events and scheduled executions. Existing work may finish using its previous settings."
      >
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {Object.entries(form.features).map(([name, enabled]) => (
            <Switch
              key={name}
              label={featureLabels[name]?.[0] || name}
              description={featureLabels[name]?.[1]}
              checked={enabled}
              onChange={(event) => update(`features.${name}`, event.currentTarget.checked)}
            />
          ))}
        </SimpleGrid>
      </Section>
      <Section
        title="Timing and frequency"
        description="Cron schedules use the bot server's timezone. Changes reschedule the next execution."
      >
        <NumberInput
          label="Random reply probability"
          description="0 disables random selection; 1 replies to every eligible message."
          value={form.behavior.randomReplyProbability}
          min={0}
          max={1}
          step={0.01}
          decimalScale={4}
          onChange={(value) => update('behavior.randomReplyProbability', value)}
          error={fieldError('behavior.randomReplyProbability')}
        />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label="Daily quote schedule"
            description="Cron format, for example: 0 8 * * *"
            value={form.behavior.dailyQuoteSchedule}
            onChange={(event) => update('behavior.dailyQuoteSchedule', event.currentTarget.value)}
            error={fieldError('behavior.dailyQuoteSchedule')}
          />
          <TextInput
            label="Future news schedule"
            description="Cron format, for example: 0 18 * * *"
            value={form.behavior.futureNewsSchedule}
            onChange={(event) => update('behavior.futureNewsSchedule', event.currentTarget.value)}
            error={fieldError('behavior.futureNewsSchedule')}
          />
        </SimpleGrid>
        <NumberInput
          label="Presence rotation interval"
          suffix=" min"
          value={form.behavior.presenceRotationMinutes}
          min={1}
          max={35791}
          allowDecimal={false}
          onChange={(value) => update('behavior.presenceRotationMinutes', value)}
          error={fieldError('behavior.presenceRotationMinutes')}
        />
      </Section>
    </>
  );
}
