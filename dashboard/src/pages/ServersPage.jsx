import { useMemo, useState } from 'react';
import {
  Alert, Avatar, Badge, Button, Group, Paper, Stack, Table, Text, TextInput,
} from '@mantine/core';
import { IconRefresh, IconSearch } from '@tabler/icons-react';
import { api, dateLabel } from '../api';
import { Empty, ResourceState, Section } from '../components';
import { useResource } from '../useResource';

const FEATURE_LABELS = {
  mentionReplies: 'Mention replies',
  randomReplies: 'Random replies',
  roleRequests: 'Role requests',
  verification: 'Verification',
  ticketReplies: 'Ticket replies',
  dailyQuotes: 'Daily quotes',
  futureNews: 'Future news',
  presenceRotation: 'Presence rotation',
};

const INTERACTION_LABELS = {
  mentionReply: 'Mention reply',
  randomReply: 'Random reply',
  prefixCommand: 'Prefix command',
  slashCommand: 'Slash command',
  componentInteraction: 'Button or form',
};

function ServerSummary({ label, value }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap={4}>
        <Text size="xs" c="dimmed">{label}</Text>
        <Text size="xl" fw={700}>{value.toLocaleString()}</Text>
      </Stack>
    </Paper>
  );
}

export default function ServersPage() {
  const resource = useResource('/servers');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);
  const items = resource.data?.items || [];
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return items;
    return items.filter((server) => (
      server.name.toLocaleLowerCase().includes(normalizedQuery)
      || server.id.includes(normalizedQuery)
    ));
  }, [items, query]);

  async function refreshServers() {
    setRefreshing(true);
    setRefreshError(null);
    try {
      await api('/guilds/sync', { method: 'POST', body: {} });
      resource.refresh();
    } catch (error) {
      setRefreshError(error.message);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <Stack gap="lg">
      <Group justify="flex-end">
        <Button
          variant="default"
          size="sm"
          leftSection={<IconRefresh size={16} />}
          loading={refreshing || resource.loading}
          onClick={refreshServers}
        >
          Refresh servers
        </Button>
      </Group>
      {refreshError && <ResourceState error={refreshError} onRetry={refreshServers} />}
      <ResourceState {...resource} onRetry={resource.refresh} />
      {resource.data && (
        <>
          {resource.data.syncWarning && (
            <Alert color="yellow" title="Showing saved server details">
              Discord could not refresh this server list. Try Refresh servers to update icons and member counts.
            </Alert>
          )}
          <Group grow align="stretch" className="server-summary-grid">
            <ServerSummary label="Total servers" value={resource.data.totalServers} />
            <ServerSummary label="Enabled" value={resource.data.enabledServers} />
            <ServerSummary label="Disabled" value={resource.data.disabledServers} />
          </Group>
          <Section
            title="Server report"
            description={`Last synced ${dateLabel(resource.data.syncedAt)}. Member counts are approximate values reported by Discord. Feature switches are set per profile; badges show the features applicable to each server.`}
          >
            <TextInput
              aria-label="Search servers"
              placeholder="Search servers"
              leftSection={<IconSearch size={16} />}
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
            {filteredItems.length ? (
              <Paper withBorder className="table-wrapper-card">
                <Table.ScrollContainer minWidth={900}>
                  <Table verticalSpacing="sm">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Server</Table.Th>
                        <Table.Th>Members</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Features in use</Table.Th>
                        <Table.Th>Last bot interaction</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {filteredItems.map((server) => (
                        <Table.Tr key={server.id}>
                          <Table.Td>
                            <Group gap="sm" wrap="nowrap">
                              <Avatar src={server.iconUrl} alt={server.name} radius="md" size={40}>
                                {server.name.slice(0, 1).toUpperCase()}
                              </Avatar>
                              <Stack gap={2}>
                                <Text size="sm" fw={600}>{server.name}</Text>
                                <Text size="xs" c="dimmed" ff="monospace">{server.id}</Text>
                              </Stack>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            {server.memberCount === null ? '—' : server.memberCount.toLocaleString()}
                          </Table.Td>
                          <Table.Td>
                            <Badge color={server.enabled ? 'teal' : 'gray'} variant="light">
                              {server.enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Group gap={5} maw={340}>
                              {server.enabledFeatures.length ? server.enabledFeatures.map((feature) => (
                                <Badge key={feature} color="gray" variant="light" size="sm">
                                  {FEATURE_LABELS[feature] || feature}
                                </Badge>
                              )) : <Text size="xs" c="dimmed">No features enabled here</Text>}
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            {server.lastInteractionAt ? (
                              <Stack gap={2}>
                                <Text size="sm">{dateLabel(server.lastInteractionAt)}</Text>
                                <Text size="xs" c="dimmed">
                                  {INTERACTION_LABELS[server.lastInteractionType] || server.lastInteractionType}
                                </Text>
                              </Stack>
                            ) : <Text size="sm" c="dimmed">No interaction recorded</Text>}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              </Paper>
            ) : <Empty>{query ? 'No servers match this search.' : 'No servers found for this bot.'}</Empty>}
          </Section>
        </>
      )}
    </Stack>
  );
}
