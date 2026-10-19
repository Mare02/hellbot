import { useState } from 'react';
import {
  Badge,
  Button,
  Code,
  Drawer,
  Group,
  Pagination,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { IconEye, IconRefresh } from '@tabler/icons-react';
import { dateLabel, queryString } from '../api';
import { Empty, ResourceState, Section } from '../components';
import { useResource } from '../useResource';

function HistoryDetail({ id }) {
  const resource = useResource(`/history/${id}`);
  return (
    <>
      <ResourceState {...resource} onRetry={resource.refresh} />
      {resource.data && (
        <Stack>
          <Text size="sm" c="dimmed">
            {dateLabel(resource.data.event.createdAt || resource.data.event.created_at)} ·{' '}
            {resource.data.event.actor}
          </Text>
          <Text fw={600}>{resource.data.event.action}</Text>
          {resource.data.changes?.length ? (
            resource.data.changes.map((change) => (
              <Section key={change.path} title={change.path}>
                <Text size="xs" c="dimmed">
                  BEFORE
                </Text>
                <Code block>{JSON.stringify(change.before, null, 2) ?? '—'}</Code>
                <Text size="xs" c="dimmed">
                  AFTER
                </Text>
                <Code block>{JSON.stringify(change.after, null, 2) ?? '—'}</Code>
              </Section>
            ))
          ) : (
            <Text c="dimmed" size="sm">
              This action has no configuration diff. Secret values are never included.
            </Text>
          )}
          {resource.data.event.metadata && (
            <Section title="Details">
              <Code block>{JSON.stringify(resource.data.event.metadata, null, 2)}</Code>
            </Section>
          )}
        </Stack>
      )}
    </>
  );
}

export default function HistoryPage({ profile }) {
  const [filters, setFilters] = useState({ action: '', from: '', to: '' });
  const [query, setQuery] = useState(filters);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const resource = useResource(`/history?${queryString({ ...query, page, pageSize: 25 })}`);
  return (
    <Stack gap="lg">
      <Section
        title="Filter activity"
        description={`Configuration changes for the ${profile === 'prod' ? 'Production' : 'Development'} bot and shared dashboard data.`}
      >
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          <TextInput
            label="Action"
            placeholder="Filter by action"
            value={filters.action}
            onChange={(event) =>
              setFilters((current) => ({ ...current, action: event.currentTarget.value }))
            }
          />
          <TextInput
            label="From"
            type="date"
            value={filters.from}
            onChange={(event) =>
              setFilters((current) => ({ ...current, from: event.currentTarget.value }))
            }
          />
          <TextInput
            label="To"
            type="date"
            value={filters.to}
            onChange={(event) =>
              setFilters((current) => ({ ...current, to: event.currentTarget.value }))
            }
          />
        </SimpleGrid>
        <Group justify="flex-end">
          <Button
            variant="default"
            onClick={() => {
              const empty = { action: '', from: '', to: '' };
              setFilters(empty);
              setQuery(empty);
              setPage(1);
              resource.refresh();
            }}
          >
            Reset
          </Button>
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={() => {
              setQuery({ ...filters });
              setPage(1);
              resource.refresh();
            }}
          >
            Apply filters
          </Button>
        </Group>
      </Section>
      <ResourceState {...resource} onRetry={resource.refresh} />
      {resource.data && (
        <>
          <Text size="sm" c="dimmed">
            {resource.data.total} activity entries
          </Text>
          {resource.data.items.length ? (
            <Paper withBorder>
              <Table.ScrollContainer minWidth={650}>
                <Table verticalSpacing="md">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>When</Table.Th>
                      <Table.Th>Scope</Table.Th>
                      <Table.Th>Action</Table.Th>
                      <Table.Th>Changed by</Table.Th>
                      <Table.Th>Details</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {resource.data.items.map((item) => (
                      <Table.Tr key={item.id}>
                        <Table.Td>{dateLabel(item.createdAt || item.created_at)}</Table.Td>
                        <Table.Td>
                          <Badge
                            variant="light"
                            color={(item.profile || item.env) === 'shared' ? 'gray' : undefined}
                          >
                            {item.profile ||
                              item.env ||
                              (item.profile_id ? `Profile ${item.profile_id}` : 'Shared')}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={2}>
                            <Text size="sm" fw={500}>
                              {item.action}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {(item.changedPaths || []).join(', ')}
                            </Text>
                          </Stack>
                        </Table.Td>
                        <Table.Td>{item.actor}</Table.Td>
                        <Table.Td>
                          <Button
                            size="xs"
                            variant="subtle"
                            leftSection={<IconEye size={16} />}
                            onClick={() => setSelected(item.id)}
                          >
                            View
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Paper>
          ) : (
            <Empty>No activity matches these filters.</Empty>
          )}
          <Pagination
            total={Math.max(1, Math.ceil(resource.data.total / 25))}
            value={page}
            onChange={setPage}
          />
        </>
      )}
      <Drawer
        opened={selected !== null}
        onClose={() => setSelected(null)}
        title="Activity details"
        position="right"
        size="lg"
      >
        {selected !== null && <HistoryDetail key={selected} id={selected} />}
      </Drawer>
    </Stack>
  );
}
