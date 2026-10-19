import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import ConfigPage from './ConfigPages';
import { HistoryPage, LogsPage, SecretsPage } from './DataPages';
import { useResource } from './useResource';
import SidebarNavigation, { pages } from './SidebarNavigation';
import Overview from './pages/Overview';

export default function Dashboard() {
  const profiles = useResource('/profiles');
  const profile = profiles.data?.profile;
  const { slug } = useParams();
  const routerNavigate = useNavigate();
  const page = Object.keys(pages).find((key) => pages[key].slug === slug) || 'overview';
  const [mobileOpened, setMobileOpened] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
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
    if (next === page || !leave()) return;
    routerNavigate(`/${pages[next].slug}`);
    setMobileOpened(false);
  }
  const current = pages[page];
  const selected = profiles.data?.profiles.find((item) => item.env === profile);
  const status = profiles.data?.status?.[profile];
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
        navigate={navigate}
      />
      <AppShell.Main>
        <Container size="xl" px={0}>
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
            {profiles.error && (
              <Alert color="red" title="Bot status unavailable">
                <Group justify="space-between">
                  <Text size="sm">{profiles.error}</Text>
                  <Button size="xs" variant="light" color="red" onClick={profiles.refresh}>
                    Retry
                  </Button>
                </Group>
              </Alert>
            )}
            {profile && page === 'overview' && (
              <Overview
                key={profile}
                profile={profile}
                bot={selected}
                status={status}
                refreshStatus={profiles.refresh}
              />
            )}
            {profile && ['ai', 'settings', 'features'].includes(page) && (
              <ConfigPage
                key={`${profile}-${page}`}
                profile={profile}
                page={page}
                onDirty={markDirty}
                onBusy={markBusy}
              />
            )}
            {profile && page === 'keys' && (
              <SecretsPage
                key={`keys-${profile}`}
                profile={profile}
                onDirty={markDirty}
                onBusy={markBusy}
              />
            )}
            {profile && page === 'activity' && <HistoryPage profile={profile} />}
            {profile && page === 'logs' && <LogsPage key={profile} profile={profile} />}
          </Stack>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
