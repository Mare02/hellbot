import { Box, Group, Modal, Select, SimpleGrid, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { fontOptions, themeOptions, useAppTheme } from './AppTheme.jsx';
import './AppSettingsModal.css';

const previewColors = {
  hellbot: {
    canvas: '#171311',
    sidebar: '#2b211c',
    surface: '#2b211c',
    border: '#594d47',
    text: '#f2efed',
    muted: '#b2a6a0',
    accent: '#d12f08',
    active: '#382018',
  },
  light: {
    canvas: '#ffffff',
    sidebar: '#ffffff',
    surface: '#f8f9fa',
    border: '#d1d7e0',
    text: '#252b34',
    muted: '#7d8797',
    accent: '#d12f08',
    active: '#fff1e8',
  },
};

function ThemePreview({ themeName }) {
  const colors = previewColors[themeName];

  return (
    <Box
      aria-hidden="true"
      style={{
        display: 'grid',
        gridTemplateColumns: '29% 1fr',
        height: 126,
        overflow: 'hidden',
        border: `1px solid ${colors.border}`,
        borderRadius: 7,
        background: colors.canvas,
      }}
    >
      <Stack gap={7} p={7} style={{ background: colors.sidebar, borderRight: `1px solid ${colors.border}` }}>
        <Group gap={5} wrap="nowrap">
          <Box style={{ width: 13, height: 13, flexShrink: 0, borderRadius: 4, background: colors.surface, border: `1px solid ${colors.border}` }} />
          <Stack gap={3} style={{ flex: 1 }}>
            <Box style={{ width: '78%', height: 4, borderRadius: 3, background: colors.text, opacity: 0.9 }} />
            <Box style={{ width: '56%', height: 3, borderRadius: 3, background: colors.muted, opacity: 0.75 }} />
          </Stack>
        </Group>
        <Box mt={1} style={{ width: '34%', height: 3, borderRadius: 3, background: colors.muted, opacity: 0.7 }} />
        <Stack gap={3}>
          {[0, 1, 2, 3].map((item) => (
            <Group
              key={item}
              gap={4}
              wrap="nowrap"
              px={4}
              py={3}
              style={{ borderRadius: 3, background: item === 1 ? colors.active : 'transparent' }}
            >
              <Box style={{ width: 5, height: 5, flexShrink: 0, borderRadius: 2, background: item === 1 ? colors.accent : colors.muted, opacity: item === 1 ? 1 : 0.65 }} />
              <Box style={{ width: item === 1 ? '62%' : '48%', height: 3, borderRadius: 3, background: item === 1 ? colors.text : colors.muted, opacity: item === 1 ? 0.9 : 0.65 }} />
            </Group>
          ))}
        </Stack>
      </Stack>
      <Stack gap={6} p={8}>
        <Box style={{ width: '33%', height: 6, borderRadius: 3, background: colors.text, opacity: 0.9 }} />
        <Box style={{ width: '62%', height: 3, borderRadius: 3, background: colors.muted, opacity: 0.75 }} />
        <Group justify="space-between" mt={2} wrap="nowrap">
          <Box style={{ width: '20%', height: 4, borderRadius: 3, background: colors.muted, opacity: 0.65 }} />
          <Box style={{ width: '18%', height: 9, border: `1px solid ${colors.border}`, borderRadius: 3, background: colors.surface }} />
        </Group>
        <Stack gap={0} style={{ border: `1px solid ${colors.border}`, borderRadius: 4, overflow: 'hidden' }}>
          {[0, 1, 2].map((item) => (
            <Group
              key={item}
              gap={5}
              px={5}
              py={5}
              wrap="nowrap"
              style={{ borderBottom: item < 2 ? `1px solid ${colors.border}` : undefined }}
            >
              <Box style={{ width: 5, height: 5, flexShrink: 0, borderRadius: '50%', background: item === 0 ? colors.accent : colors.muted, opacity: item === 0 ? 1 : 0.6 }} />
              <Box style={{ width: `${52 + item * 8}%`, height: 3, borderRadius: 3, background: colors.text, opacity: 0.7 }} />
            </Group>
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}

export default function AppSettingsModal({ opened, onClose }) {
  const { themeName, setThemeName, fontName, setFontName } = useAppTheme();

  return (
    <Modal opened={opened} onClose={onClose} title="App settings" size="sm">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Personalize the dashboard appearance on this device.
        </Text>
        <Stack gap="xs">
          <Text size="sm" fw={600}>Theme</Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            {themeOptions.map((option) => {
              const selected = themeName === option.value;
              return (
                <UnstyledButton
                  key={option.value}
                  className="app-theme-choice"
                  aria-pressed={selected}
                  onClick={() => setThemeName(option.value)}
                >
                  <Stack gap="xs">
                    <ThemePreview themeName={option.value} />
                    <Group justify="space-between" gap="xs" wrap="nowrap">
                      <Text size="sm" fw={selected ? 600 : 500} c="var(--mantine-color-text)">
                        {option.label}
                      </Text>
                      {selected && <IconCheck size={17} color="var(--mantine-primary-color-6)" />}
                    </Group>
                  </Stack>
                </UnstyledButton>
              );
            })}
          </SimpleGrid>
        </Stack>
        <Select
          label="Font"
          value={fontName}
          data={fontOptions.map(({ value, label }) => ({ value, label }))}
          onChange={setFontName}
          allowDeselect={false}
        />
      </Stack>
    </Modal>
  );
}
