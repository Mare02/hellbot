import { lazy, useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  AppShell,
  Burger,
  Button,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { api } from './api';
import LazyContent from './LazyContent';
import { useResource } from './useResource';
import SidebarNavigation, { pages } from './SidebarNavigation';

const Overview = lazy(() => import('./pages/Overview'));
const ConfigPage = lazy(() => import('./ConfigPages'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const LogsPage = lazy(() => import('./pages/LogsPage'));
const SecretsPage = lazy(() => import('./pages/SecretsPage'));
const CodeUpdatesPage = lazy(() => import('./pages/CodeUpdatesPage'));

export default function Dashboard() {
  const profiles = useResource('/profiles');
  const profile = profiles.data?.profile;
  const location = useLocation();
  const { slug } = useParams();
  const routerNavigate = useNavigate();
  const page = Object.keys(pages).find((key) => pages[key].slug === slug) || 'overview';
  const [mobileOpened, setMobileOpened] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [profileSyncing, setProfileSyncing] = useState(false);
  const [profileSyncError, setProfileSyncError] = useState(null);
  const markDirty = useCallback((value) => setDirty(value), []);
  const markBusy = useCallback((value) => setPending(value), []);
  useEffect(() => {
    if (!Object.values(pages).some((item) => item.slug === slug)) {
      routerNavigate('/overview', { replace: true });
    }
  }, [routerNavigate, slug]);
  useEffect(() => {
    if (!dirty && !pending) return undefined;
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty, pending]);
  function leave() {
    if (pending) return false;
    if (dirty && !window.confirm('Discard unsaved changes?')) return false;
    setDirty(false);
    return true;
  }
  function navigate(next) {
    if (next === page) {
      setMobileOpened(false);
      return;
    }
    if (!leave()) return;
    routerNavigate(`/${pages[next].slug}`);
    setMobileOpened(false);
  }
  const current = pages[page];
  const selected = profiles.data?.profiles.find((item) => item.env === profile);
  async function syncProfile() {
    setProfileSyncing(true);
    setProfileSyncError(null);
    try {
      await api('/profiles/sync', { method: 'POST', body: {} });
      profiles.refresh();
    } catch (error) {
      setProfileSyncError(error.message);
    } finally {
      setProfileSyncing(false);
    }
  }
  return (
    <AppShell
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !mobileOpened } }}
      padding={{ base: 'md', sm: 'xl' }}
    >
      <SidebarNavigation
        profile={profile}
        bot={selected}
        page={page}
        pending={pending}
        onClose={() => setMobileOpened(false)}
        navigate={navigate}
        onSyncProfile={syncProfile}
        profileSyncing={profileSyncing}
      />
      <AppShell.Main>
        <Container size={1200} px={0}>
          <Stack gap="xl">
            <Group hiddenFrom="sm">
              <Burger
                opened={mobileOpened}
                onClick={() => setMobileOpened((value) => !value)}
                size="sm"
                aria-label="Toggle navigation"
              />
            </Group>
            <Stack gap={4}>
              <Title order={1} size="h2">
                {current.title}
              </Title>
              <Text size="sm" c="dimmed">
                {current.description}
              </Text>
            </Stack>
            {profileSyncError && (
              <Alert
                color="red"
                title="Could not sync bot profile"
                withCloseButton
                onClose={() => setProfileSyncError(null)}
              >
                {profileSyncError}
              </Alert>
            )}
            {profiles.error && (
              <Alert color="red" title="Dashboard data unavailable">
                <Group justify="space-between">
                  <Text size="sm">{profiles.error}</Text>
                  <Button size="xs" variant="light" color="red" onClick={profiles.refresh}>
                    Retry
                  </Button>
                </Group>
              </Alert>
            )}
            {profile && (
              <LazyContent resetKey={`${profile}-${page}`}>
                {page === 'overview' && (
                  <Overview
                    key={profile}
                    profile={profile}
                    bot={selected}
                    refreshProfile={profiles.refresh}
                    onOpenActivity={(id) =>
                      routerNavigate(`/${pages.activity.slug}`, {
                        state: id ? { focusActivityId: id } : null,
                      })
                    }
                    onOpenLogs={(item) =>
                      routerNavigate(`/${pages.logs.slug}`, {
                        state: item ? { focusLogItem: item } : null,
                      })
                    }
                    onOpenAiSettings={() => routerNavigate(`/${pages.ai.slug}`)}
                    onOpenApiKeys={() => routerNavigate(`/${pages.keys.slug}`)}
                  />
                )}
                {['ai', 'settings', 'features'].includes(page) && (
                  <ConfigPage
                    key={`${profile}-${page}`}
                    profile={profile}
                    page={page}
                    onDirty={markDirty}
                    onBusy={markBusy}
                  />
                )}
                {page === 'keys' && (
                  <SecretsPage
                    key={`keys-${profile}`}
                    profile={profile}
                    onDirty={markDirty}
                    onBusy={markBusy}
                  />
                )}
                {page === 'activity' && (
                  <HistoryPage profile={profile} focusId={location.state?.focusActivityId} />
                )}
                {page === 'code' && <CodeUpdatesPage />}
                {page === 'logs' && (
                  <LogsPage key={profile} profile={profile} focusItem={location.state?.focusLogItem} />
                )}
              </LazyContent>
            )}
          </Stack>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
