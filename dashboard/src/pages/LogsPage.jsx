import { useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Code,
  Drawer,
  Group,
  Pagination,
  Paper,
  Select,
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

export default function LogsPage({ profile }) {
  const [filters, setFilters] = useState({
    level: '',
    component: '',
    command: '',
    from: '',
    to: '',
  });
  const [query, setQuery] = useState(filters);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const resource = useResource(
    `/profiles/${profile}/logs?${queryString({ ...query, page, pageSize: 25 })}`
  );
  return (
    <Stack gap="lg">
      <Section
        title="Filter logs"
        description="Refresh to load new entries. Sensitive values are redacted before logs are stored."
      >
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          <Select
            label="Level"
            data={[
              { value: '', label: 'All levels' },
              ...['debug', 'info', 'warn', 'error'].map((value) => ({ value, label: value })),
            ]}
            value={filters.level}
            onChange={(value) => setFilters((current) => ({ ...current, level: value || '' }))}
          />
          <TextInput
            label="Component"
            value={filters.component}
            onChange={(event) =>
              setFilters((current) => ({ ...current, component: event.currentTarget.value }))
            }
          />
          <TextInput
            label="Command"
            value={filters.command}
            onChange={(event) =>
              setFilters((current) => ({ ...current, command: event.currentTarget.value }))
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
              const empty = { level: '', component: '', command: '', from: '', to: '' };
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
            Apply filters / refresh
          </Button>
        </Group>
      </Section>
      <ResourceState {...resource} onRetry={resource.refresh} />
      {resource.data && (
        <>
          <Text c="dimmed" size="sm">
            {resource.data.total} log entries
          </Text>
          {resource.data.items.length ? (
            <Paper withBorder>
              <Table.ScrollContainer minWidth={700}>
                <Table verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>When</Table.Th>
                      <Table.Th>Level</Table.Th>
                      <Table.Th>Context</Table.Th>
                      <Table.Th>Message</Table.Th>
                      <Table.Th>Details</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {resource.data.items.map((item, index) => (
                      <Table.Tr key={`${item.timestamp}-${index}`}>
                        <Table.Td>
                          <Text size="xs" ff="monospace">
                            {dateLabel(item.timestamp)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            size="sm"
                            variant="light"
                            color={
                              item.level === 'error'
                                ? 'red'
                                : item.level === 'warn'
                                  ? 'yellow'
                                  : 'gray'
                            }
                          >
                            {item.level}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={2}>
                            <Text size="xs">{item.component || '—'}</Text>
                            {item.command && <Code>{item.command}</Code>}
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" ff="monospace" lineClamp={3}>
                            {item.message}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <ActionIcon
                            aria-label="View log details"
                            variant="subtle"
                            onClick={() => setSelected(item)}
                          >
                            <IconEye size={17} />
                          </ActionIcon>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Paper>
          ) : (
            <Empty>No log entries match these filters.</Empty>
          )}
          <Pagination
            total={Math.max(1, Math.ceil(resource.data.total / 25))}
            value={page}
            onChange={setPage}
          />
        </>
      )}
      <Drawer
        opened={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Log details"
        position="right"
        size="lg"
      >
        {selected && (
          <Stack>
            <Group>
              <Badge color={selected.level === 'error' ? 'red' : 'gray'}>{selected.level}</Badge>
              <Text c="dimmed" size="sm">
                {dateLabel(selected.timestamp)}
              </Text>
            </Group>
            <Code block>{selected.message}</Code>
            <Code block>{JSON.stringify(selected.context || {}, null, 2)}</Code>
            <Text c="dimmed" size="sm">
              {selected.component}
              {selected.command ? ` · ${selected.command}` : ''}
            </Text>
          </Stack>
        )}
      </Drawer>
    </Stack>
  );
}
