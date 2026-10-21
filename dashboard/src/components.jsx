import { Alert, Badge, Button, Group, Loader, Paper, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';

export function ResourceState({
  loading,
  error,
  onRetry,
  errorColor = 'red',
  errorTitle = 'Could not load this page',
  errorMessage = error,
}) {
  if (loading)
    return (
      <Group p="xl" justify="center">
        <Loader size="sm" />
        <Text c="dimmed">Loading…</Text>
      </Group>
    );
  if (error)
    return (
      <Alert color={errorColor} title={errorTitle} icon={<IconAlertCircle size={18} />}>
        <Stack gap="sm">
          <Text size="sm">{errorMessage}</Text>
          <Button variant="light" color={errorColor} onClick={onRetry} w="fit-content">
            Try again
          </Button>
        </Stack>
      </Alert>
    );
  return null;
}

export function Section({ title, description, children }) {
  return (
    <Paper withBorder p={{ base: 'md', sm: 'xl' }} radius="md">
      <Stack gap="lg">
        <Stack gap={4}>
          <Text fw={600}>{title}</Text>
          {description && (
            <Text size="sm" c="dimmed">
              {description}
            </Text>
          )}
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
}

export function ApplyStatus({ application }) {
  if (!application?.length) return null;
  return <Alert color="green" icon={<IconCheck size={18} />} title="Saved" />;
}


export function Empty({ children }) {
  return (
    <Paper withBorder p="xl" ta="center">
      <Text c="dimmed">{children}</Text>
    </Paper>
  );
}
