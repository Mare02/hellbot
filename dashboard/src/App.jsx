import { Badge, Center, Container, Group, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconCircleCheck } from '@tabler/icons-react';

export default function App() {
  return (
    <Center mih="100vh" p="md">
      <Container size="sm" w="100%">
        <Paper withBorder radius="lg" p={{ base: 'xl', sm: 48 }} shadow="md">
          <Stack align="center" gap="lg" ta="center">
            <ThemeIcon size={64} radius="xl" variant="light" color="orange">
              <IconCircleCheck size={34} stroke={1.75} />
            </ThemeIcon>
            <Badge color="orange" variant="light" size="lg">Početna stranica</Badge>
            <Title order={1}>Hellbot Dashboard</Title>
            <Text size="lg" c="dimmed">
              Dashboard je pokrenut. Podešavanja ćemo dodati u sledećoj fazi.
            </Text>
            <Group justify="center" gap="xs">
              <Badge variant="outline">React + Vite</Badge>
              <Badge variant="outline">Mantine</Badge>
              <Badge variant="outline">Express</Badge>
              <Badge variant="outline">SQLite</Badge>
            </Group>
          </Stack>
        </Paper>
      </Container>
    </Center>
  );
}
