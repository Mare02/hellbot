import { Button, Group, Modal, Pagination, Stack, Text } from '@mantine/core';
import { IconFilter, IconRefresh } from '@tabler/icons-react';

export function ListFilters({
  list,
  title,
  description,
  totalLabel,
  resetLabel = 'Reset filters',
  applyLabel = 'Apply filters',
  children,
}) {
  return (
    <>
      <Modal
        opened={list.filtersOpened}
        onClose={() => list.setFiltersOpened(false)}
        title={title}
        size="lg"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">{description}</Text>
          {children}
          <Group justify="space-between">
            <Button variant="default" miw={100} onClick={list.resetFilters}>
              {resetLabel}
            </Button>
            <Button leftSection={<IconRefresh size={16} />} onClick={list.applyFilters}>
              {applyLabel}
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Group justify="space-between">
        {list.resource.data && (
          <Text size="sm" c="dimmed">{list.resource.data.total} {totalLabel}</Text>
        )}
        <Button
          variant="default"
          leftSection={<IconFilter size={16} />}
          onClick={() => list.setFiltersOpened(true)}
        >
          Filters{list.activeFilterCount > 0 ? ` (${list.activeFilterCount})` : ''}
        </Button>
      </Group>
    </>
  );
}

export function ListPagination({ list }) {
  return <Pagination total={list.totalPages} value={list.page} onChange={list.setPage} />;
}
