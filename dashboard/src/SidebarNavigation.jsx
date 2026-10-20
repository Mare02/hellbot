import {
  AppShell,
  ActionIcon,
  Avatar,
  Divider,
  Group,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconActivity,
  IconAdjustments,
  IconBolt,
  IconBrain,
  IconKey,
  IconLayoutDashboard,
  IconRefresh,
  IconTerminal2,
} from '@tabler/icons-react';

export const pages = {
  overview: {
    slug: 'overview',
    title: 'Overview',
    description: 'Status and saved settings for the selected bot.',
    icon: IconLayoutDashboard,
  },
  ai: {
    slug: 'ai-settings',
    title: 'AI settings',
    description: 'Providers, models and the tools available to your bot.',
    icon: IconBrain,
  },
  settings: {
    slug: 'bot-settings',
    title: 'Bot settings',
    description: 'Command appearance and Hellbot workflows.',
    icon: IconAdjustments,
  },
  features: {
    slug: 'features',
    title: 'Features',
    description: 'Control bot behavior and scheduled actions.',
    icon: IconBolt,
  },
  logs: {
    slug: 'errors-logs',
    title: 'Logs',
    description: 'Inspect recent events and errors for this bot.',
    icon: IconTerminal2,
  },
  keys: {
    slug: 'api-keys',
    title: 'API keys',
    description: 'AI and integration credentials used by this bot.',
    icon: IconKey,
    shared: true,
  },
  activity: {
    slug: 'activity-log',
    title: 'Activity log',
    description: 'A history of changes made through this dashboard instance.',
    icon: IconActivity,
    shared: true,
  },
};

export default function SidebarNavigation({
  profile,
  bot,
  page,
  pending,
  navigate,
  onSyncProfile,
  profileSyncing,
}) {
  return (
    <AppShell.Navbar p="md">
      <AppShell.Section>
        <Group gap="xs" mb="xl" px="xs" wrap="nowrap">
          <Avatar
            src={bot?.profileImageUrl || bot?.profile_image_url}
            radius="md"
            size={40}
          >
            H
          </Avatar>
          <Stack gap={0}>
            <Text fw={600} size="md">
              {bot?.name || 'Hellbot'}
            </Text>
            <Text size="xs" c="dimmed">
              {profile === 'prod' ? 'Production' : profile === 'dev' ? 'Development' : 'Connecting…'}
            </Text>
          </Stack>
          <Tooltip label="Sync bot info">
            <ActionIcon
              variant="subtle"
              aria-label="Sync bot info"
              loading={profileSyncing}
              disabled={!bot || profileSyncing}
              onClick={onSyncProfile}
            >
              <IconRefresh size={17} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </AppShell.Section>
      <AppShell.Section grow component={ScrollArea}>
        <Text tt="uppercase" size="xs" fw={600} c="dimmed" px="sm" mb="xs">
          Bot
        </Text>
        {Object.entries(pages)
          .filter(([, item]) => !item.shared)
          .map(([key, item]) => (
            <NavLink
              key={key}
              label={item.title}
              leftSection={<item.icon size={19} stroke={1.7} />}
              active={page === key}
              disabled={pending}
              onClick={() => navigate(key)}
              mb={4}
              bdrs="sm"
            />
          ))}
        <Divider my="lg" />
        <Text tt="uppercase" size="xs" fw={600} c="dimmed" px="sm" mb="xs">
          Workspace
        </Text>
        {Object.entries(pages)
          .filter(([, item]) => item.shared)
          .map(([key, item]) => (
            <NavLink
              key={key}
              label={item.title}
              leftSection={<item.icon size={19} stroke={1.7} />}
              active={page === key}
              disabled={pending}
              onClick={() => navigate(key)}
              mb={4}
              bdrs="sm"
            />
          ))}
      </AppShell.Section>
    </AppShell.Navbar>
  );
}
