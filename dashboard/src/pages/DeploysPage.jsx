import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Anchor, Badge, Button, Code, Drawer, Group, Loader, Paper, Stack, Table, Text,
} from '@mantine/core';
import { IconCheck, IconExternalLink, IconRefresh, IconTerminal2 } from '@tabler/icons-react';
import { api, dateLabel } from '../api';
import { Empty, ResourceState, Section } from '../components';
import './DeploysPage.css';

const RUNNING = new Set(['queued', 'in_progress', 'waiting', 'pending', 'requested']);
const STATUS_LABELS = {
  queued: 'Queued', in_progress: 'Running', waiting: 'Waiting', pending: 'Pending',
  requested: 'Requested', success: 'Succeeded', failure: 'Failed', cancelled: 'Cancelled',
  skipped: 'Skipped', timed_out: 'Timed out', action_required: 'Action required',
  neutral: 'Neutral', stale: 'Stale', completed: 'Completed', startup_failure: 'Could not start',
};

function statusValue(item) {
  return item.conclusion || item.status || 'unknown';
}

function StatusBadge({ item }) {
  const status = statusValue(item);
  const color = status === 'success' ? 'teal'
    : ['failure', 'timed_out', 'startup_failure'].includes(status) ? 'red'
      : RUNNING.has(status) || status === 'action_required' ? 'yellow' : 'gray';
  return <Badge color={color} variant="light" tt="none">{STATUS_LABELS[status] || status}</Badge>;
}

function durationLabel(seconds) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '—';
  const rounded = Math.max(0, Math.round(seconds));
  if (rounded < 60) return `${rounded}s`;
  const minutes = Math.floor(rounded / 60);
  return `${minutes}m ${rounded % 60}s`;
}

function isActive(data) {
  return data?.runs?.some((run) => RUNNING.has(run.status)) || RUNNING.has(data?.run?.status);
}

// Preserve the current view while polling; replacing the page with a loader hides useful progress.
function useDeployResource(path, poll = false) {
  const [state, setState] = useState({ path: null, data: null, loading: false, error: null });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!path) return undefined;
    const controller = new AbortController();
    setState((previous) => ({
      path, data: previous.path === path ? previous.data : null, loading: true, error: null,
    }));
    api(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ path, data, loading: false, error: null });
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setState((previous) => ({ ...previous, loading: false, error: failure.message }));
      });
    return () => controller.abort();
  }, [path, revision]);
  const data = state.path === path ? state.data : null;
  const active = poll && isActive(data);
  useEffect(() => {
    if (!active || state.loading) return undefined;
    const update = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const timer = window.setTimeout(update, 15_000);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, [active, state.loading, refresh]);
  return {
    data,
    loading: Boolean(path) && (state.path !== path || state.loading),
    error: state.path === path ? state.error : null,
    refresh,
  };
}

function GithubLink({ url, children }) {
  if (!url || !url.startsWith('https://github.com/')) return null;
  return (
    <Anchor href={url} target="_blank" rel="noopener noreferrer" size="sm">
      <Group gap={5} wrap="nowrap">{children}<IconExternalLink size={14} aria-hidden="true" /></Group>
    </Anchor>
  );
}

export default function DeploysPage() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const resource = useDeployResource(`/project/deploys?page=${page}`, true);
  const data = resource.data;
  const live = data?.live;
  return (
    <Stack gap="lg">
      <Group justify="flex-end">
        <Button
          variant="default" size="sm" leftSection={<IconRefresh size={16} />}
          loading={resource.loading} onClick={resource.refresh}
        >
          Refresh
        </Button>
      </Group>
      <ResourceState
        loading={resource.loading && !data} error={resource.error} onRetry={resource.refresh}
      />
      {data && (
        <>
          <Paper withBorder radius="md" p={{ base: 'md', sm: 'xl' }}>
            <Group justify="space-between" align="flex-start" gap="lg">
              <Stack gap="xs">
                <Group gap="xs">
                  <Text size="sm" fw={600}>Live version</Text>
                  <Badge color={live ? 'teal' : 'gray'} variant="light" tt="none">
                    {live ? 'Health checked' : 'Not recorded'}
                  </Badge>
                </Group>
                {live ? (
                  <Stack gap={6}>
                    {live.title && <Text size="sm" fw={500} style={{ overflowWrap: 'anywhere' }}>{live.title}</Text>}
                    <Group gap="xs">
                      <Code title={live.sha}>{live.sha.slice(0, 7)}</Code>
                      <Text size="xs" c="dimmed">Verified {dateLabel(live.verifiedAt)}</Text>
                    </Group>
                  </Stack>
                ) : (
                  <Text size="sm" c={data.liveNotice ? 'yellow' : 'dimmed'}>
                    {data.liveNotice || 'No verified release has been recorded for this installation.'}
                  </Text>
                )}
                {data.checkout?.sha && data.checkout.sha !== live?.sha && (
                  <Text size="xs" c="dimmed">
                    Current checkout: {data.checkout.sha.slice(0, 7)} · {data.checkout.branch}.
                    {' '}A checkout alone does not confirm a healthy release.
                  </Text>
                )}
              </Stack>
              <GithubLink url={data.workflowUrl}>GitHub Actions</GithubLink>
            </Group>
          </Paper>
          {data.notice && <Alert color="yellow" title="Deployment history">{data.notice}</Alert>}
          <Section
            title="Deploy history"
            description={data.repository ? `${data.repository} · production workflow` : 'Production workflow runs'}
          >
            {data.historyError ? (
              <ResourceState error={data.historyError} onRetry={resource.refresh} />
            ) : data.runs.length ? (
              <Table.ScrollContainer minWidth={720}>
                <Table verticalSpacing="md">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Deploy</Table.Th><Table.Th>Workflow status</Table.Th><Table.Th>Commit</Table.Th>
                      <Table.Th>Started</Table.Th><Table.Th>Duration</Table.Th><Table.Th />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {data.runs.map((run) => (
                      <Table.Tr key={run.id}>
                        <Table.Td>
                          <Stack gap={3}>
                            <Text size="sm" fw={500} lineClamp={2}>{run.title || `Deploy #${run.number}`}</Text>
                            <Text size="xs" c="dimmed">
                              #{run.number} · {run.branch} · {run.actor || 'Unknown actor'}
                              {run.attempt > 1 ? ` · attempt ${run.attempt}` : ''}
                            </Text>
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={5} align="flex-start">
                            <StatusBadge item={run} />
                            {live?.runId != null && String(live.runId) === String(run.id) && live?.attempt === run.attempt && (
                              <Text size="xs" c="teal" fw={600}>Live release</Text>
                            )}
                          </Stack>
                        </Table.Td>
                        <Table.Td><Code title={run.sha}>{run.sha.slice(0, 7)}</Code></Table.Td>
                        <Table.Td><Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>{dateLabel(run.startedAt || run.createdAt)}</Text></Table.Td>
                        <Table.Td><Text size="sm" className="deploy-duration">{durationLabel(run.durationSeconds)}</Text></Table.Td>
                        <Table.Td><Button variant="subtle" size="xs" onClick={() => setSelected(run)}>Details</Button></Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            ) : <Empty>{data.configured ? 'No deploys found for this workflow.' : 'Connect GitHub to view deploys.'}</Empty>}
            {(page > 1 || data.hasMore) && (
              <Group justify="space-between">
                <Button variant="default" size="xs" disabled={page === 1 || resource.loading} onClick={() => setPage((value) => value - 1)}>Previous</Button>
                <Text size="xs" c="dimmed">Page {page}</Text>
                <Button variant="default" size="xs" disabled={!data.hasMore || resource.loading} onClick={() => setPage((value) => value + 1)}>Next</Button>
              </Group>
            )}
          </Section>
        </>
      )}
      <Drawer
        opened={Boolean(selected)} onClose={() => setSelected(null)} position="right" size="xl"
        title={selected ? `Deploy #${selected.number}` : 'Deploy details'}
        closeButtonProps={{ 'aria-label': 'Close deploy details' }}
      >
        {selected && <DeployDetails key={`${selected.id}-${selected.attempt}`} selected={selected} live={live} />}
      </Drawer>
    </Stack>
  );
}

function DeployDetails({ selected, live }) {
  const resource = useDeployResource(`/project/deploys/${selected.id}?attempt=${selected.attempt}`, true);
  const data = resource.data;
  const run = data?.run || selected;
  const verified = live?.runId != null && String(live.runId) === String(selected.id) && live?.attempt === selected.attempt;
  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <Group justify="space-between">
          <Group gap="xs"><Text size="xs" c="dimmed">Workflow</Text><StatusBadge item={run} /></Group>
          <GithubLink url={run.url}>View on GitHub</GithubLink>
        </Group>
        <Text fw={600}>{run.title}</Text>
        <Group gap="xs">
          <Code title={run.sha}>{run.sha.slice(0, 7)}</Code>
          <Text size="xs" c="dimmed">{run.branch} · attempt {run.attempt} · {durationLabel(run.durationSeconds)}</Text>
        </Group>
        <Text size="xs" c="dimmed">Started {dateLabel(run.startedAt || run.createdAt)}</Text>
        {verified && (
          <Stack gap={4}>
            <Group gap={6}>
              <IconCheck size={16} color="var(--mantine-color-teal-text)" aria-hidden="true" />
              <Text size="sm" c="teal" fw={600}>Live release verified</Text>
            </Group>
            <Text size="xs" c="dimmed">
              Bot and dashboard health checks passed. See each job below for later steps and notification status.
            </Text>
          </Stack>
        )}
      </Stack>
      <Group justify="space-between">
        <Text size="sm" fw={600}>Workflow steps</Text>
        <Button size="xs" variant="subtle" leftSection={<IconRefresh size={14} />} loading={resource.loading} onClick={resource.refresh}>Refresh</Button>
      </Group>
      <ResourceState loading={resource.loading && !data} error={resource.error} onRetry={resource.refresh} />
      {data?.jobsTruncated && <Text size="sm" c="dimmed">Additional jobs are available on GitHub.</Text>}
      {data && !data.jobs.length && <Text size="sm" c="dimmed">Jobs will appear when GitHub starts this run.</Text>}
      {data?.jobs.map((job) => <DeployJob key={job.id} job={job} run={run} />)}
    </Stack>
  );
}

function DeployJob({ job, run }) {
  const [logsOpened, setLogsOpened] = useState(false);
  const logs = useDeployResource(logsOpened
    ? `/project/deploys/${run.id}/jobs/${job.id}/logs?attempt=${run.attempt}` : null);
  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Text size="sm" fw={600}>{job.name}</Text>
          <StatusBadge item={job} />
        </Group>
        {job.steps.map((step) => (
          <Group key={step.number} justify="space-between" gap="sm" wrap="nowrap">
            <Text size="sm" style={{ overflowWrap: 'anywhere' }}>{step.name}</Text>
            <StatusBadge item={step} />
          </Group>
        ))}
        <Group justify="space-between">
          <Button
            variant="subtle" size="xs" leftSection={<IconTerminal2 size={15} />}
            onClick={() => setLogsOpened((value) => !value)} aria-expanded={logsOpened}
          >
            {logsOpened ? 'Hide logs' : 'View logs'}
          </Button>
          {logsOpened && <Button variant="subtle" size="xs" onClick={logs.refresh} disabled={logs.loading}>Refresh logs</Button>}
        </Group>
        {logsOpened && (
          <Stack gap="xs">
            {job.status !== 'completed' && <Text size="xs" c="dimmed">GitHub usually makes logs available after this job finishes.</Text>}
            {logs.loading && <Group gap="xs"><Loader size="xs" /><Text size="xs" c="dimmed">Loading logs…</Text></Group>}
            {logs.error && <Text size="sm" c="red" role="alert">{logs.error}</Text>}
            {logs.data?.notice && <Text size="sm" c="dimmed">{logs.data.notice}</Text>}
            {logs.data?.text && (
              <pre className="deploy-log" tabIndex={0} aria-label={`${job.name} logs`}>{logs.data.text}</pre>
            )}
            {logs.data?.truncated && <Text size="xs" c="dimmed">Log preview truncated. Open the GitHub run for the full output.</Text>}
            {logs.data && !logs.data.text && !logs.data.notice && <Text size="sm" c="dimmed">No log output is available yet.</Text>}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
