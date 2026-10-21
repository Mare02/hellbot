import { lazy, useEffect, useRef, useState } from 'react';
import { Alert, Button, Fieldset, Group, Paper, Stack, Tabs, Text } from '@mantine/core';
import { useSearchParams } from 'react-router-dom';

import { IconDeviceFloppy, IconRotate } from '@tabler/icons-react';
import { api, changedFields } from './api';
import { ApplyStatus, ResourceState } from './components';
import { useResource } from './useResource';
import { AiSettingsForm, BotSettingsForm, FeaturesForm } from './ConfigForms';
import LazyContent from './LazyContent';

const AiUsageSection = lazy(() => import('./AiUsageSection'));

export default function ConfigPage({ profile, page, onDirty, onBusy }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'usage' ? 'usage' : 'settings';
  const resource = useResource(`/profiles/${profile}/config`);
  const catalog = useResource('/catalog');
  const [original, setOriginal] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [issues, setIssues] = useState([]);
  const [application, setApplication] = useState(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    if (resource.data) {
      setOriginal(resource.data.config);
      setForm(structuredClone(resource.data.config));
    }
  }, [resource.data]);
  const dirty = original && form ? Object.keys(changedFields(original, form)).length > 0 : false;
  useEffect(() => {
    onDirty(Boolean(dirty));
  }, [dirty, onDirty]);
  useEffect(() => {
    onBusy(busy);
  }, [busy, onBusy]);
  const update = (path, value) => {
    setForm((current) => {
      const next = structuredClone(current);
      const parts = path.split('.');
      const last = parts.pop();
      parts.reduce((object, key) => object[key], next)[last] = value;
      return next;
    });
    setIssues([]);
  };
  const fieldError = (path) => {
    const issue = issues.find(
      (item) => (Array.isArray(item.path) ? item.path.join('.') : item.path) === path,
    );
    if (!issue) return undefined;
    return (
      {
        invalid_type: 'Enter a value in the expected format.',
        invalid_format: 'Check the format of this value.',
        invalid_value: 'Choose one of the available options.',
        too_small: 'This value is too small or too short.',
        too_big: 'This value is too large or too long.',
        custom: 'Check this value.',
      }[issue.message] || issue.message
    );
  };
  async function save() {
    setBusy(true);
    setError(null);
    setIssues([]);
    try {
      const result = await api(`/profiles/${profile}/config`, {
        method: 'PATCH',
        body: changedFields(original, form),
      });
      if (!active.current) return;
      setOriginal(result.config);
      setForm(structuredClone(result.config));
      setApplication(result.application);
    } catch (failure) {
      if (active.current) {
        setError(failure.message);
        setIssues(Array.isArray(failure.issues) ? failure.issues : []);
      }
    } finally {
      if (active.current) setBusy(false);
    }
  }
  if (resource.loading || resource.error || !form)
    return <ResourceState {...resource} onRetry={resource.refresh} />;

  const settings = (
    <Fieldset disabled={busy} variant="unstyled">
      <Stack gap="lg" w="100%">
        {error && (
          <Alert color="red" title="Could not save settings">
            {error}
          </Alert>
        )}
        <ApplyStatus application={application} />
        {page === 'ai' && (
          <AiSettingsForm form={form} update={update} fieldError={fieldError} catalog={catalog} />
        )}
        {page === 'settings' && (
          <BotSettingsForm form={form} update={update} fieldError={fieldError} />
        )}
        {page === 'features' && (
          <FeaturesForm form={form} update={update} fieldError={fieldError} />
        )}
        {dirty && (
          <Paper pos="sticky" bottom="md" p="md" withBorder shadow="md">
            <Group justify="space-between">
              <Stack gap={2}>
                <Text fw={600} size="sm">
                  Unsaved changes
                </Text>
                <Text c="dimmed" size="xs">
                  {profile === 'prod' ? 'Production' : 'Development'} ·{' '}
                  {Object.keys(changedFields(original, form)).length} section(s) changed
                </Text>
              </Stack>
              <Group gap="xs">
                <Button
                  variant="default"
                  leftSection={<IconRotate size={16} />}
                  disabled={busy}
                  onClick={() => {
                    setForm(structuredClone(original));
                    setError(null);
                    setIssues([]);
                  }}
                >
                  Discard
                </Button>
                <Button
                  loading={busy}
                  leftSection={<IconDeviceFloppy size={16} />}
                  onClick={save}
                >
                  Save changes
                </Button>
              </Group>
            </Group>
          </Paper>
        )}
      </Stack>
    </Fieldset>
  );

  if (page !== 'ai') return settings;

  return (
    <Tabs
      value={activeTab}
      onChange={(value) => {
        if (!value || value === activeTab) return;
        setSearchParams((current) => {
          const next = new URLSearchParams(current);
          next.set('tab', value);
          return next;
        });
      }}
    >
      <Tabs.List aria-label="AI settings navigation" mb="lg">
        <Tabs.Tab value="settings">Settings</Tabs.Tab>
        <Tabs.Tab value="usage">Usage</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="settings">{settings}</Tabs.Panel>
      <Tabs.Panel value="usage" keepMounted={false}>
        <LazyContent resetKey={profile}>
          {activeTab === 'usage' && <AiUsageSection key={profile} profile={profile} />}
        </LazyContent>
      </Tabs.Panel>
    </Tabs>
  );
}
