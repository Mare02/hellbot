import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Code,
  Drawer,
  Group,
  Modal,
  Pagination,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { IconEye, IconFilter, IconRefresh, IconSearch } from '@tabler/icons-react';
import { dateLabel, queryString } from '../api';
import { Empty, ResourceState } from '../components';
import { useResource } from '../useResource';

export default function LogsPage({ profile, focusItem }) {
  const [filters, setFilters] = useState({
    search: '',
    level: '',
    component: '',
    command: '',
    from: '',
    to: '',
  });
  const [query, setQuery] = useState(filters);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [filtersOpened, setFiltersOpened] = useState(false);
  const activeFilterCount = Object.values(query).filter(Boolean).length;
  const resource = useResource(
    `/profiles/${profile}/logs?${queryString({ ...query, page, pageSize: 25 })}`
  );
  useEffect(() => {
    if (focusItem) setSelected(focusItem);
  }, [focusItem]);
  return (
    <Stack gap="lg">
      <Modal
        opened={filtersOpened}
        onClose={() => setFiltersOpened(false)}
        title="Filter logs"
        size="lg"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Search by text, level, component, command, or date. Sensitive values are redacted before
            logs are stored.
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label="Text search"
              placeholder="Search messages and details"
              leftSection={<IconSearch size={16} />}
              maxLength={256}
              value={filters.search}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setFilters((current) => ({ ...current, search: value }));
              }}
            />
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
              onChange={(event) => {
                const value = event.currentTarget.value;
                setFilters((current) => ({ ...current, component: value }));
              }}
            />
            <TextInput
              label="Command"
              value={filters.command}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setFilters((current) => ({ ...current, command: value }));
              }}
            />
            <TextInput
              label="From"
              type="date"
              value={filters.from}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setFilters((current) => ({ ...current, from: value }));
              }}
            />
            <TextInput
              label="To"
              type="date"
              value={filters.to}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setFilters((current) => ({ ...current, to: value }));
              }}
            />
          </SimpleGrid>
          <Group justify="space-between">
            <Button
              variant="default"
              onClick={() => {
                const empty = { search: '', level: '', component: '', command: '', from: '', to: '' };
                setFilters(empty);
                setQuery(empty);
                setPage(1);
                resource.refresh();
                setFiltersOpened(false);
              }}
            >
              Reset filters
            </Button>
            <Button
              leftSection={<IconRefresh size={16} />}
              onClick={() => {
                setQuery({ ...filters });
                setPage(1);
                resource.refresh();
                setFiltersOpened(false);
              }}
            >
              Apply filters / refresh
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Group justify="space-between">
        {resource.data && (
          <Text c="dimmed" size="sm">
            {resource.data.total} log entries
          </Text>
        )}
        <Button
          variant="default"
          leftSection={<IconFilter size={16} />}
          onClick={() => setFiltersOpened(true)}
        >
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </Button>
      </Group>
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
