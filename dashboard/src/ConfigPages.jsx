import { lazy, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Fieldset,
  Group,
  Paper,
  Stack,
  Tabs,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useSearchParams } from 'react-router-dom';

import { IconCheck, IconDeviceFloppy, IconRotate } from '@tabler/icons-react';
import { api, changedFields } from './api';
import { ResourceState } from './components';
import { useResource } from './useResource';
import { AiSettingsForm, BotSettingsForm } from './ConfigForms';
import LazyContent from './LazyContent';
import './ConfigPages.css';

const botSettingsSections = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'discord', label: 'Discord setup' },
  { id: 'workflows', label: 'Workflows' },
  { id: 'features', label: 'Features' },
  { id: 'jobs', label: 'Scheduled jobs' },
  { id: 'access', label: 'Server access' },
];

function sectionHasChanges(section, changes) {
  if (section === 'appearance') return 'commandsPrefix' in changes || 'embedColor' in changes;
  if (section === 'discord') {
    return ['homeServerId', 'testingServerId', 'logChannelId', 'verifyChannelId', 'generalChannelId',
      'hellbotUpdatesChannelId', 'masterCreationsChannelId', 'uniqueCreationsChannelId',
      'masterPhotosChannelId', 'verificationLogsChannelId', 'minecraftCategoryId',
      'staffMemberRoleId', 'verifiedRoleId'].some((key) => key in changes);
  }
  if (section === 'workflows') {
    return 'roleRequests' in changes;
  }
  if (section === 'features') {
    const featureChanges = changes.features || {};
    return ['mentionReplies', 'randomReplies', 'roleRequests', 'verification', 'ticketReplies']
      .some((key) => key in featureChanges)
      || 'randomReplyProbability' in (changes.behavior || {});
  }
  if (section === 'jobs') {
    const featureChanges = changes.features || {};
    const behaviorChanges = changes.behavior || {};
    return ['dailyQuotes', 'futureNews', 'presenceRotation'].some((key) => key in featureChanges)
      || ['dailyQuoteSchedule', 'futureNewsSchedule', 'presenceRotationMinutes']
        .some((key) => key in behaviorChanges);
  }
  return 'disabledGuildIds' in changes;
}

const AiUsageSection = lazy(() => import('./AiUsageSection'));

export default function ConfigPage({ profile, page, onDirty, onBusy }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab = page === 'ai'
    ? requestedTab === 'usage' ? 'usage' : 'settings'
    : botSettingsSections.some(({ id }) => id === requestedTab)
      ? requestedTab
      : 'appearance';
  const resource = useResource(`/profiles/${profile}/config`);
  const catalog = useResource('/catalog');
  const [original, setOriginal] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [issues, setIssues] = useState([]);
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
  const changes = original && form ? changedFields(original, form) : {};
  const dirty = Object.keys(changes).length > 0;
  const changedSectionCount = page === 'settings'
    ? botSettingsSections.filter(({ id }) => sectionHasChanges(id, changes)).length
    : Object.keys(changes).length;
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
      notifications.show({
        message: 'Saved',
        color: 'green',
        icon: <IconCheck size={18} />,
        autoClose: 3000,
        position: 'top-right',
      });
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
      <Stack gap="lg" w="100%" pb={dirty ? 120 : 0}>
        {error && (
          <Alert color="red" title="Could not save settings">
            {error}
          </Alert>
        )}
        {page === 'ai' && (
          <AiSettingsForm form={form} update={update} fieldError={fieldError} catalog={catalog} />
        )}
        {page === 'settings' && (
          <BotSettingsForm
            form={form}
            update={update}
            fieldError={fieldError}
            section={activeTab}
          />
        )}
      </Stack>
    </Fieldset>
  );

  const saveFooter = dirty && (
    <div className="config-save-footer">
      <Paper className="config-save-footer-inner" p="md" withBorder shadow="md">
        <Group justify="space-between" wrap="wrap" gap="md">
          <Stack gap={2}>
            <Text fw={600} size="sm">
              Unsaved changes
            </Text>
            <Text c="dimmed" size="xs">
              {profile === 'prod' ? 'Production' : 'Development'} ·{' '}
              {changedSectionCount} section(s) changed
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
    </div>
  );

  if (page === 'settings') {
    return (
      <>
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
          <Tabs.List aria-label="Bot settings navigation" mb="lg">
            {botSettingsSections.map((section) => (
              <Tabs.Tab key={section.id} value={section.id}>
                <Group gap="xs" wrap="nowrap">
                  <span>{section.label}</span>
                  {sectionHasChanges(section.id, changes) && (
                    <Badge size="xs" variant="light" color="yellow">Unsaved</Badge>
                  )}
                </Group>
              </Tabs.Tab>
            ))}
          </Tabs.List>
          {botSettingsSections.map((section) => (
            <Tabs.Panel key={section.id} value={section.id}>
              {activeTab === section.id && settings}
            </Tabs.Panel>
          ))}
        </Tabs>
        {saveFooter}
      </>
    );
  }

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
      <Tabs.List aria-label={`${page === 'ai' ? 'AI' : 'Bot'} settings navigation`} mb="lg">
        <Tabs.Tab value="settings">Settings</Tabs.Tab>
        {page === 'ai' ? (
          <Tabs.Tab value="usage">Usage</Tabs.Tab>
        ) : (
          <Tabs.Tab value="features">Features</Tabs.Tab>
        )}
      </Tabs.List>
      <Tabs.Panel value="settings">{activeTab === 'settings' && settings}</Tabs.Panel>
      {page === 'ai' ? (
        <Tabs.Panel value="usage" keepMounted={false}>
          <LazyContent resetKey={profile}>
            {activeTab === 'usage' && <AiUsageSection key={profile} profile={profile} />}
          </LazyContent>
        </Tabs.Panel>
      ) : (
        <Tabs.Panel value="features">{activeTab === 'features' && settings}</Tabs.Panel>
      )}
      {saveFooter}
    </Tabs>
  );
}
