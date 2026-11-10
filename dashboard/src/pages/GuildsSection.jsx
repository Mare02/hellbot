import { useMemo, useState } from 'react';
import {
  Alert, Avatar, Badge, Button, Group, Paper, Stack, Switch, Table, Text, TextInput,
} from '@mantine/core';
import { IconRefresh, IconSearch } from '@tabler/icons-react';
import { api, dateLabel } from '../api';
import { Empty, ResourceState } from '../components';
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

export default function GuildsSection({ disabledGuildIds = [], onToggleGuild }) {
  const resource = useResource('/guilds/activity');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);
  const guilds = useMemo(() => (resource.data?.guilds || []).map((guild) => {
    const enabled = !disabledGuildIds.includes(guild.id);
    return {
      ...guild,
      enabled,
      enabledFeatures: enabled
        ? guild.applicableFeatures || guild.enabledFeatures
        : [],
    };
  }), [disabledGuildIds, resource.data?.guilds]);
  const filteredGuilds = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return guilds;
    return guilds.filter((guild) => (
      guild.name.toLocaleLowerCase().includes(normalizedQuery)
      || guild.id.includes(normalizedQuery)
    ));
  }, [guilds, query]);

  async function refreshGuilds() {
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
      <Group justify="space-between" align="center">
        <Text size="xs" c="dimmed">
          {resource.data?.syncedAt
            ? `Last refreshed: ${dateLabel(resource.data.syncedAt)}`
            : 'Load the guilds this bot has joined from Discord.'}
        </Text>
        <Button
          variant="default"
          size="sm"
          leftSection={<IconRefresh size={16} />}
          loading={refreshing || resource.loading}
          onClick={refreshGuilds}
        >
          Refresh guilds
        </Button>
      </Group>
      {refreshError && <ResourceState error={refreshError} onRetry={refreshGuilds} />}
      <ResourceState {...resource} onRetry={resource.refresh} />
      {resource.data && (
        <>
          {resource.data.syncWarning && (
            <Alert color="yellow" title="Showing saved guild details">
              Discord could not refresh this guild list. Try Refresh guilds to update icons and member counts.
            </Alert>
          )}
          <TextInput
            aria-label="Search guilds"
            placeholder="Search guilds"
            leftSection={<IconSearch size={16} />}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
          {filteredGuilds.length ? (
            <Paper withBorder className="table-wrapper-card">
              <Table.ScrollContainer minWidth={900}>
                <Table verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Guild</Table.Th>
                      <Table.Th>Members</Table.Th>
                      <Table.Th>Features in use</Table.Th>
                      <Table.Th>Last bot interaction</Table.Th>
                      <Table.Th>Enabled</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredGuilds.map((guild) => (
                      <Table.Tr key={guild.id}>
                        <Table.Td>
                          <Group gap="sm" wrap="nowrap">
                            <Avatar src={guild.iconUrl} alt={guild.name} radius="md" size={40}>
                              {guild.name.slice(0, 1).toUpperCase()}
                            </Avatar>
                            <Stack gap={2}>
                              <Text size="sm" fw={600}>{guild.name}</Text>
                              <Text size="xs" c="dimmed" ff="monospace">{guild.id}</Text>
                            </Stack>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          {guild.memberCount === null ? '—' : guild.memberCount.toLocaleString()}
                        </Table.Td>
                        <Table.Td>
                          <Group gap={5} maw={340}>
                            {guild.enabledFeatures.length ? guild.enabledFeatures.map((feature) => (
                              <Badge key={feature} color="gray" variant="light" size="sm">
                                {FEATURE_LABELS[feature] || feature}
                              </Badge>
                            )) : <Text size="xs" c="dimmed">No features enabled here</Text>}
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          {guild.lastInteractionAt ? (
                            <Stack gap={2}>
                              <Text size="sm">{dateLabel(guild.lastInteractionAt)}</Text>
                              <Text size="xs" c="dimmed">
                                {INTERACTION_LABELS[guild.lastInteractionType] || guild.lastInteractionType}
                              </Text>
                            </Stack>
                          ) : <Text size="sm" c="dimmed">No interaction recorded</Text>}
                        </Table.Td>
                        <Table.Td>
                          <Switch
                            aria-label={`Enable Hellbot in ${guild.name}`}
                            checked={guild.enabled}
                            onChange={(event) => onToggleGuild?.(guild.id, event.currentTarget.checked)}
                          />
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Paper>
          ) : <Empty>{query ? 'No guilds match this search.' : 'No guilds found for this bot.'}</Empty>}
        </>
      )}
    </Stack>
  );
}
