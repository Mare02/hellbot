import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Code,
  Drawer,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { IconEye, IconSearch } from '@tabler/icons-react';
import { dateLabel } from '../api';
import { Empty, ResourceState } from '../components';
import { useFilteredResource } from '../useFilteredResource';
import { ListFilters, ListPagination } from '../ListFilters';

const INITIAL_FILTERS = { search: '', level: '', component: '', command: '', from: '', to: '' };

export default function LogsPage({ profile, focusItem }) {
  const list = useFilteredResource(`/profiles/${profile}/logs`, INITIAL_FILTERS);
  const { filters, setFilter, resource } = list;
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    if (focusItem) setSelected(focusItem);
  }, [focusItem]);
  return (
    <Stack gap="lg">
      <ListFilters
        list={list}
        title="Filter logs"
        description="Search by text, level, component, command, or date. Sensitive values are redacted before logs are stored."
        totalLabel="log entries"
        applyLabel="Apply filters / refresh"
      >
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label="Text search"
            placeholder="Search messages and details"
            leftSection={<IconSearch size={16} />}
            maxLength={256}
            value={filters.search}
            onChange={(event) => setFilter('search', event.currentTarget.value)}
          />
          <Select
            label="Level"
            data={[
              { value: '', label: 'All levels' },
              ...['debug', 'info', 'warn', 'error'].map((value) => ({ value, label: value })),
            ]}
            value={filters.level}
            onChange={(value) => setFilter('level', value || '')}
          />
          <TextInput
            label="Component"
            value={filters.component}
            onChange={(event) => setFilter('component', event.currentTarget.value)}
          />
          <TextInput
            label="Command"
            value={filters.command}
            onChange={(event) => setFilter('command', event.currentTarget.value)}
          />
          <TextInput
            label="From"
            type="date"
            value={filters.from}
            onChange={(event) => setFilter('from', event.currentTarget.value)}
          />
          <TextInput
            label="To"
            type="date"
            value={filters.to}
            onChange={(event) => setFilter('to', event.currentTarget.value)}
          />
        </SimpleGrid>
      </ListFilters>
      <ResourceState {...resource} onRetry={resource.refresh} />
      {resource.data && (
        <>
          {resource.data.items.length ? (
            <Paper withBorder>
              <Table.ScrollContainer minWidth={700}>
                <Table verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>When</Table.Th>
                      <Table.Th miw={100}>Level</Table.Th>
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
                        <Table.Td miw={100}>
                          <Badge
                            w="max-content"
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
                          <Text size="sm" ff="monospace" lineClamp={2}>
                            {item.message}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Button
                            size="xs"
                            variant="subtle"
                            leftSection={<IconEye size={16} />}
                            onClick={() => setSelected(item)}
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
            <Empty>No log entries match these filters.</Empty>
          )}
          <ListPagination list={list} />
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
