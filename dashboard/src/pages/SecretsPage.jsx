import { useEffect, useRef, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  PasswordInput,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconCheck,
  IconCopy,
  IconEdit,
  IconKey,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { api, dateLabel, mergeApplication } from '../api';
import { ApplyStatus, ResourceState } from '../components';
import { useResource } from '../useResource';

const PROVIDERS = {
  groq: { label: 'Groq', group: 'AI providers' },
  google: { label: 'Google', group: 'AI providers' },
  edenai: { label: 'EdenAI · image generation', group: 'AI providers' },
  newsapi: { label: 'NewsAPI', group: 'Integrations' },
  exchangerate: { label: 'ExchangeRate-API', group: 'Integrations' },
  apininjas: { label: 'API Ninjas', group: 'Integrations' },
};

export default function SecretsPage({ profile, onDirty, onBusy }) {
  const resource = useResource('/secrets');
  const catalog = useResource('/catalog');
  const providers = Array.isArray(catalog.data?.secretProviders)
    ? catalog.data.secretProviders.filter((item) => item.value && item.label && item.group)
    : [];
  const providerGroups = [...new Set(providers.map((item) => item.group))].map((group) => ({
    group,
    items: providers
      .filter((item) => item.group === group)
      .map(({ value, label }) => ({ value, label })),
  }));
  const providerInfo = (value) =>
    providers.find((item) => item.value === value) || PROVIDERS[value];
  const sections = [
    ...new Set(['AI providers', 'Integrations', ...providers.map((item) => item.group)]),
  ];
  if (resource.data?.secrets.some((item) => !providerInfo(item.provider)))
    sections.push('Other providers');
  const [editor, setEditor] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [provider, setProvider] = useState('groq');
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [connectionResults, setConnectionResults] = useState({});
  const [testingId, setTestingId] = useState(null);
  const [copyingEnv, setCopyingEnv] = useState(false);
  const [copyEnvStatus, setCopyEnvStatus] = useState(null);
  const [application, setApplication] = useState(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    onDirty(Boolean(editor && (value !== (editor.value || '') || label !== (editor.label || ''))));
  }, [editor, value, label, onDirty]);
  useEffect(() => {
    onBusy(busy);
  }, [busy, onBusy]);
  async function open(item, group) {
    if (busy) return;
    setError(null);
    if (!item?.id) {
      setEditor({});
      setProvider(providers.find((entry) => entry.group === group)?.value || '');
      setLabel('');
      setValue('');
      return;
    }
    setBusy(true);
    try {
      const { secret } = await api(`/secrets/${item.id}/edit`, { method: 'POST', body: {} });
      if (!active.current) return;
      setEditor(secret);
      setProvider(secret.provider);
      setLabel(secret.label);
      setValue(secret.value);
    } catch (failure) {
      if (active.current) setError(failure.message);
    } finally {
      if (active.current) setBusy(false);
    }
  }
  function close() {
    if (busy) return;
    if (
      (value !== (editor?.value || '') || label !== (editor?.label || '')) &&
      !window.confirm('Discard unsaved key changes?')
    )
      return;
    setEditor(null);
    setValue('');
    setLabel('');
  }
  async function action(callback, secretId) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await callback();
      if (!active.current) return;
      if (result.application)
        setApplication((previous) => mergeApplication(previous || [], result.application));
      if (secretId) {
        setConnectionResults((previous) => {
          const next = { ...previous };
          delete next[secretId];
          return next;
        });
      }
      resource.refresh();
      setEditor(null);
      setRemoving(null);
      setValue('');
      setLabel('');
    } catch (failure) {
      if (active.current) setError(failure.message);
    } finally {
      if (active.current) setBusy(false);
    }
  }
  async function testConnection(item) {
    if (busy) return;
    const allowGeneration = item.provider === 'edenai';
    if (
      allowGeneration &&
      !window.confirm(
        'This check generates one 512×512 test image and may use provider credits. Continue?'
      )
    )
      return;
    setBusy(true);
    setTestingId(item.id);
    setConnectionResults((previous) => ({ ...previous, [item.id]: null }));
    try {
      const result = await api(`/secrets/${item.id}/test?profile=${profile}`, {
        method: 'POST',
        body: allowGeneration ? { allowGeneration: true } : {},
      });
      if (active.current)
        setConnectionResults((previous) => ({ ...previous, [item.id]: result }));
    } catch (failure) {
      if (active.current)
        setConnectionResults((previous) => ({
          ...previous,
          [item.id]: { success: false, tested: true, message: failure.message },
        }));
    } finally {
      if (active.current) {
        setTestingId(null);
        setBusy(false);
      }
    }
  }

  function save() {
    if (!editor?.id && !providers.some((item) => item.value === provider)) return;
    if (editor.id) {
      const body = {
        ...(label !== editor.label ? { label } : {}),
        ...(value !== editor.value ? { value } : {}),
      };
      return action(() => api(`/secrets/${editor.id}`, { method: 'PATCH', body }), editor.id);
    }
    return action(() => api('/secrets', { method: 'POST', body: { provider, label, value } }));
  }

  async function copyEnv() {
    if (copyingEnv) return;
    setCopyingEnv(true);
    setCopyEnvStatus(null);
    try {
      const { content } = await api('/secrets/export', { method: 'POST', body: {} });
      await navigator.clipboard.writeText(content);
      setCopyEnvStatus({ success: true, message: 'Environment copied to clipboard.' });
    } catch (failure) {
      setCopyEnvStatus({
        success: false,
        message: failure.message || 'Could not copy the environment to the clipboard.',
      });
    } finally {
      setCopyingEnv(false);
    }
  }

  return (
    <Stack gap="xl">
      {!editor && error && (
        <Alert color="red" title="Action failed">
          {error}
        </Alert>
      )}
      <ApplyStatus application={application} />
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          Manage credentials for AI providers and integrations used by this bot.
        </Text>
        <Group gap="xs">
          <Button
            variant="default"
            leftSection={<IconCopy size={16} />}
            loading={copyingEnv}
            disabled={busy}
            onClick={copyEnv}
          >
            Copy .env
          </Button>
          <Button
            variant="default"
            leftSection={<IconRefresh size={16} />}
            disabled={busy}
            onClick={() => {
              setConnectionResults({});
              resource.refresh();
              catalog.refresh();
            }}
          >
            Refresh
          </Button>
        </Group>
      </Group>
      {copyEnvStatus && (
        <Text size="sm" c={copyEnvStatus.success ? 'teal' : 'red'} role="status" aria-live="polite">
          {copyEnvStatus.message}
        </Text>
      )}
      <ResourceState {...catalog} onRetry={catalog.refresh} />
      {catalog.data && !providers.length && (
        <Alert title="Provider catalog unavailable">
          No supported API key providers were returned. Refresh to try again. Existing keys are
          still listed below.
        </Alert>
      )}
      <ResourceState {...resource} onRetry={resource.refresh} />
      {resource.data &&
        sections.map((group) => {
          const items = resource.data.secrets.filter(
            (item) => (providerInfo(item.provider)?.group || 'Other providers') === group
          );
          return (
            <Paper className="table-wrapper-card" key={group} withBorder p={{ base: 'md', sm: 'lg' }} radius="md">
              <Stack gap="md">
                <Group justify="space-between" align="center">
                  <Text fw={600}>{group}</Text>
                  {group !== 'Other providers' && (
                    <Button
                      leftSection={<IconPlus size={16} />}
                      disabled={busy || !providers.some((item) => item.group === group)}
                      onClick={() => open(null, group)}
                    >
                      Add API key
                    </Button>
                  )}
                </Group>
                {group === 'Integrations' && (
                  <Text size="sm" c="dimmed">
                    Weather does not need an API key. Bugsnag is configured through the environment.
                  </Text>
                )}
                {items.length ? (
                  <Table.ScrollContainer minWidth={650}>
                    <Table verticalSpacing="md" horizontalSpacing="lg">
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Label</Table.Th>
                          <Table.Th>Provider</Table.Th>
                          <Table.Th>Updated</Table.Th>
                          <Table.Th>Actions</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {items.map((item) => (
                          <Table.Tr key={item.id}>
                            <Table.Td>
                              <Group gap="xs" wrap="nowrap">
                                <IconKey size={16} />
                                <Text fw={500} size="sm" style={{ whiteSpace: 'nowrap' }}>
                                  {item.label}
                                </Text>
                              </Group>
                            </Table.Td>
                            <Table.Td>
                              <Badge variant="light">
                                {providerInfo(item.provider)?.label || item.provider}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm" c="dimmed">
                                {dateLabel(
                                  item.updatedAt ||
                                    item.updated_at ||
                                    item.createdAt ||
                                    item.created_at
                                )}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Group gap="xs">
                                <Button
                                  size="xs"
                                  variant="light"
                                  loading={testingId === item.id}
                                  disabled={busy}
                                  onClick={() => testConnection(item)}
                                >
                                  Test connection
                                </Button>
                                <ConnectionResult result={connectionResults[item.id]} />
                                <Tooltip label="Edit key">
                                  <ActionIcon
                                    variant="subtle"
                                    aria-label={`Edit ${item.label}`}
                                    disabled={busy}
                                    onClick={() => open(item)}
                                  >
                                    <IconEdit size={17} />
                                  </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Delete key">
                                  <ActionIcon
                                    variant="subtle"
                                    color="red"
                                    aria-label={`Delete ${item.label}`}
                                    disabled={busy}
                                    onClick={() => setRemoving(item)}
                                  >
                                    <IconTrash size={17} />
                                  </ActionIcon>
                                </Tooltip>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Table.ScrollContainer>
                ) : (
                  <Text size="sm" c="dimmed" py="sm">
                    No API keys for {group.toLowerCase()} yet.
                  </Text>
                )}
              </Stack>
            </Paper>
          );
        })}
      <Modal
        opened={Boolean(editor)}
        onClose={close}
        title={editor?.id ? 'Edit API key' : 'Add API key'}
        closeOnClickOutside={!busy}
        closeOnEscape={!busy}
        withCloseButton={!busy}
      >
        <Stack>
          {error && <Alert color="red">{error}</Alert>}
          {!editor?.id && (
            <Select
              label="Provider"
              value={provider}
              data={providerGroups}
              onChange={(next) => next && setProvider(next)}
              disabled={busy || !providers.length}
              allowDeselect={false}
            />
          )}
          <TextInput
            label="Label"
            placeholder="Primary key"
            value={label}
            onChange={(event) => setLabel(event.currentTarget.value)}
            disabled={busy}
            maxLength={100}
            autoComplete="off"
          />
          <PasswordInput
            label="Key"
            value={value}
            onChange={(event) => setValue(event.currentTarget.value)}
            disabled={busy}
            autoComplete="new-password"
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button
              loading={busy}
              onClick={save}
              disabled={
                (!editor?.id && !providers.some((item) => item.value === provider)) ||
                !label.trim() ||
                !value.trim() ||
                (editor?.id && label === editor.label && value === editor.value)
              }
            >
              Save key
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal
        opened={Boolean(removing)}
        onClose={() => !busy && setRemoving(null)}
        title="Delete API key"
        closeOnClickOutside={!busy}
        closeOnEscape={!busy}
        withCloseButton={!busy}
      >
        <Stack>
          <Text size="sm">
            Delete “{removing?.label}”? Both bots will stop using this key for new requests.
          </Text>
          {error && <Alert color="red">{error}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" disabled={busy} onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              color="red"
              loading={busy}
              onClick={() =>
                action(() => api(`/secrets/${removing.id}`, { method: 'DELETE' }), removing.id)
              }
            >
              Delete key
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

function ConnectionResult({ result }) {
  const successful = result?.success && result.tested === true;
  const unchecked = result?.tested === false;
  const Icon = successful ? IconCheck : unchecked ? IconAlertCircle : IconX;
  const label = successful
    ? 'Connection successful'
    : unchecked
      ? 'Connection not checked'
      : 'Connection failed';

  return (
    <span role="status" aria-live="polite">
      {result && (
        <Tooltip
          label={`${label}: ${result.message}`}
          events={{ hover: true, focus: true, touch: true }}
          multiline
          w={280}
        >
          <Text
            component="span"
            c={successful ? 'teal' : unchecked ? 'yellow' : 'red'}
            tabIndex={0}
            aria-label={`${label}: ${result.message}`}
            style={{ display: 'inline-flex', verticalAlign: 'middle' }}
          >
            <Icon size={18} aria-hidden="true" />
          </Text>
        </Tooltip>
      )}
    </span>
  );
}
