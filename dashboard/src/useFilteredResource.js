import { useState } from 'react';
import { queryString } from './api';
import { useResource } from './useResource';

export function useFilteredResource(path, initialFilters, pageSize = 25) {
  const [filters, setFilters] = useState(initialFilters);
  const [query, setQuery] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [filtersOpened, setFiltersOpened] = useState(false);
  const resource = useResource(`${path}?${queryString({ ...query, page, pageSize })}`);

  function setFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function applyFilters() {
    setQuery({ ...filters });
    setPage(1);
    resource.refresh();
    setFiltersOpened(false);
  }

  function resetFilters() {
    setFilters(initialFilters);
    setQuery(initialFilters);
    setPage(1);
    resource.refresh();
    setFiltersOpened(false);
  }

  return {
    filters,
    setFilter,
    filtersOpened,
    setFiltersOpened,
    applyFilters,
    resetFilters,
    activeFilterCount: Object.values(query).filter(Boolean).length,
    page,
    setPage,
    totalPages: Math.max(1, Math.ceil((resource.data?.total || 0) / pageSize)),
    resource,
  };
}
