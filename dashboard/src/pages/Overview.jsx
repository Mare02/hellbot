import { Avatar, Button, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { dateLabel } from '../api';
import { ResourceState, Section } from '../components';
import { useResource } from '../useResource';

export default function Overview({ profile, bot, status, refreshStatus }) {
  const config = useResource(`/profiles/${profile}/config`);
  const history = useResource(`/history?profile=${profile}&pageSize=5&page=1`);
  const logs = useResource(`/profiles/${profile}/logs?level=error&pageSize=5&page=1`);
  function refresh() {
    refreshStatus();
    config.refresh();
    history.refresh();
    logs.refresh();
  }
  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Group>
          <Avatar
            src={bot?.profileImageUrl || bot?.profile_image_url}
            radius="md"
            size={56}
          >
            H
          </Avatar>
          <Stack gap={3}>
            <Title order={2} size="h3">
              {bot?.name || 'Hellbot'}
            </Title>
          </Stack>
        </Group>
        <Button variant="default" leftSection={<IconRefresh size={16} />} onClick={refresh}>
          Refresh
        </Button>
      </Group>
      <ResourceState {...config} onRetry={config.refresh} />
      {config.data && (
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <Section title="AI provider">
            <Text fw={600} size="lg">
              {config.data.config.ai.provider === 'google' ? 'Google Gemini' : 'Groq'}
            </Text>
            <Text c="dimmed" size="sm">
              {config.data.config.ai.models[config.data.config.ai.provider].text}
            </Text>
          </Section>
          <Section title="Enabled features">
            <Text fw={600} size="lg">
              {Object.values(config.data.config.features).filter(Boolean).length} /{' '}
              {Object.keys(config.data.config.features).length}
            </Text>
            <Text c="dimmed" size="sm">
              Bot features enabled
            </Text>
          </Section>
          <Section title="Last applied">
            <Text fw={500} size="sm">
              {dateLabel(status?.appliedAt)}
            </Text>
            <Text c="dimmed" size="sm">
              {status?.online
                ? 'Connected to the bot process'
                : 'Settings load when the bot starts'}
            </Text>
          </Section>
        </SimpleGrid>
      )}
      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        <Section title="Recent activity">
          <ResourceState {...history} onRetry={history.refresh} />
          {history.data &&
            (history.data.items.length ? (
              <Stack gap="md">
                {history.data.items.map((item) => (
                  <Stack key={item.id} gap={3}>
                    <Text size="sm" fw={500}>
                      {item.action}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {dateLabel(item.createdAt || item.created_at)} · {item.actor}
                    </Text>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Text size="sm" c="dimmed">
                No changes recorded for this bot.
              </Text>
            ))}
        </Section>
        <Section title="Recent errors">
          <ResourceState {...logs} onRetry={logs.refresh} />
          {logs.data &&
            (logs.data.items.length ? (
              <Stack gap="md">
                {logs.data.items.map((item, index) => (
                  <Stack key={index} gap={3}>
                    <Text size="sm" lineClamp={2}>
                      {item.message}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {dateLabel(item.timestamp)} · {item.component || 'Bot'}
                    </Text>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Text size="sm" c="dimmed">
                No errors recorded for this bot.
              </Text>
            ))}
        </Section>
      </SimpleGrid>
    </Stack>
  );
}
