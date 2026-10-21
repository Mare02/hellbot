import { Avatar, Badge, Button, Group, Paper, Stack, Table, Text, Title } from '@mantine/core';
import { IconBrain, IconEye, IconRefresh, IconArrowRight } from '@tabler/icons-react';
import { dateLabel } from '../api';
import { Empty, ResourceState } from '../components';
import { useResource } from '../useResource';

function ActivityTable({ resource, onOpen, onViewAll }) {
  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Text fw={600}>Recent activity</Text>
        <Button
          variant="subtle"
          size="compact-sm"
          rightSection={<IconArrowRight size={15} />}
          onClick={() => onViewAll()}
        >
          View all
        </Button>
      </Group>
      <ResourceState {...resource} onRetry={resource.refresh} />
      {resource.data && (resource.data.items.length ? (
        <Paper withBorder>
          <Table.ScrollContainer minWidth={620}>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>When</Table.Th>
                  <Table.Th>Action</Table.Th>
                  <Table.Th>Changed by</Table.Th>
                  <Table.Th>Details</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {resource.data.items.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>
                      <Text size="xs">
                        {dateLabel(item.createdAt || item.created_at)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={2}>
                        <Text size="sm" fw={500}>{item.action}</Text>
                        <Text size="xs" className="overview-table-secondary" lineClamp={1}>
                          {(item.changedPaths || []).join(', ') || 'Configuration change'}
                        </Text>
                      </Stack>
                    </Table.Td>
                    <Table.Td><Text size="sm">{item.actor || 'System'}</Text></Table.Td>
                    <Table.Td>
                      <Button
                        size="xs"
                        variant="subtle"
                        leftSection={<IconEye size={15} />}
                        onClick={() => onOpen(item.id)}
                      >
                        Open
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Paper>
      ) : <Empty>No recent activity for this bot.</Empty>)}
    </Stack>
  );
}

function ErrorsTable({ resource, onOpen, onViewAll }) {
  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Text fw={600}>Recent errors</Text>
        <Button
          variant="subtle"
          size="compact-sm"
          rightSection={<IconArrowRight size={15} />}
          onClick={() => onViewAll()}
        >
          View all
        </Button>
      </Group>
      <ResourceState {...resource} onRetry={resource.refresh} />
      {resource.data && (resource.data.items.length ? (
        <Paper withBorder>
          <Table.ScrollContainer minWidth={700}>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>When</Table.Th>
                  <Table.Th>Level</Table.Th>
                  <Table.Th>Component</Table.Th>
                  <Table.Th>Message</Table.Th>
                  <Table.Th>Details</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {resource.data.items.map((item, index) => (
                  <Table.Tr key={`${item.timestamp}-${index}`}>
                    <Table.Td>
                      <Text size="xs" ff="monospace">{dateLabel(item.timestamp)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        w="max-content"
                        size="sm"
                        variant="light"
                        color={item.level === 'error' ? 'red' : item.level === 'warn' ? 'yellow' : 'gray'}
                      >
                        {item.level}
                      </Badge>
                    </Table.Td>
                    <Table.Td><Text size="sm">{item.component || 'Bot'}</Text></Table.Td>
                    <Table.Td>
                      <Text size="sm" ff="monospace" lineClamp={2}>{item.message}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Button
                        size="xs"
                        variant="subtle"
                        leftSection={<IconEye size={15} />}
                        onClick={() => onOpen(item)}
                      >
                        Open
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Paper>
      ) : <Empty>No recent errors for this bot.</Empty>)}
    </Stack>
  );
}

export default function Overview({
  profile,
  bot,
  refreshProfile,
  onOpenActivity,
  onOpenLogs,
  onOpenAiSettings,
  onOpenApiKeys,
}) {
  const config = useResource(`/profiles/${profile}/config`);
  const history = useResource(`/history?profile=${profile}&pageSize=5&page=1`);
  const logs = useResource(`/profiles/${profile}/logs?level=error&pageSize=5&page=1`);

  function refresh() {
    refreshProfile();
    config.refresh();
    history.refresh();
    logs.refresh();
  }

  const provider = config.data?.config.ai.provider;
  const providerLabel = provider === 'google' ? 'Google' : provider === 'groq' ? 'Groq' : provider;
  const model = config.data?.config.ai.models[provider]?.text;

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <Group gap="sm">
          <Avatar
            src={bot?.profileImageUrl || bot?.profile_image_url}
            radius="md"
            size={48}
          >
            H
          </Avatar>
          <Title order={2} size="h3">{bot?.name || 'Hellbot'}</Title>
        </Group>
        <Button variant="default" leftSection={<IconRefresh size={16} />} onClick={refresh}>
          Refresh
        </Button>
      </Group>

      <ResourceState {...config} onRetry={config.refresh} />
      {config.data && (
        <Paper withBorder p="md">
          <Group justify="space-between" gap="md" wrap="wrap">
            <Group gap="sm" wrap="wrap">
              <Group gap={6}>
                <IconBrain size={18} />
                <Text size="sm" fw={600}>AI provider</Text>
              </Group>
              <Badge variant="light">{providerLabel}</Badge>
              {model && <Text size="sm" c="dimmed">{model}</Text>}
            </Group>
            <Group gap="xs">
              <Button
                variant="default"
                rightSection={<IconArrowRight size={16} />}
                onClick={onOpenAiSettings}
              >
                AI settings
              </Button>
              <Button
                variant="default"
                rightSection={<IconArrowRight size={16} />}
                onClick={onOpenApiKeys}
              >
                API keys
              </Button>
            </Group>
          </Group>
        </Paper>
      )}

      <Stack gap="xl">
        <ActivityTable
          resource={history}
          onOpen={onOpenActivity}
          onViewAll={() => onOpenActivity()}
        />
        <ErrorsTable
          resource={logs}
          onOpen={onOpenLogs}
          onViewAll={() => onOpenLogs()}
        />
      </Stack>
    </Stack>
  );
}
