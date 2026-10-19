import { useState } from 'react';
import { Accordion, Badge, Group, Stack, Switch, Text, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { Section } from './components';

function ToolToggle({ tool, update }) {
  return (
    <Stack gap={5}>
      <Switch
        checked={tool.enabled}
        onChange={(event) => update(`ai.tools.${tool.name}`, event.currentTarget.checked)}
        label={
          <Text size="sm" fw={500}>
            {tool.label || tool.name}
          </Text>
        }
      />
      <Text size="sm" c="dimmed">
        {tool.description}
      </Text>
    </Stack>
  );
}

export default function AiToolsSection({ enabledTools, catalog, update }) {
  const [search, setSearch] = useState('');
  const [openedGroups, setOpenedGroups] = useState(['Chat']);
  const catalogByName = new Map((catalog.data?.tools || []).map((tool) => [tool.name, tool]));
  const tools = Object.entries(enabledTools).map(([name, enabled]) => ({
    name,
    enabled,
    description: `Allow the ${name} tool.`,
    group: 'Other tools',
    ...catalogByName.get(name),
  }));
  const term = search.trim().toLowerCase();
  const filtered = tools.filter((tool) =>
    `${tool.name} ${tool.description}`.toLowerCase().includes(term)
  );
  const groups = new Map();
  filtered.forEach((tool) => {
    if (!groups.has(tool.group)) groups.set(tool.group, []);
    groups.get(tool.group).push(tool);
  });

  return (
    <Section
      title="AI tools"
      description="Control which tools the AI can call for this bot. Disabling a tool removes it from future AI requests."
    >
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          {tools.filter((tool) => tool.enabled).length} of {tools.length} tools enabled
        </Text>
        {term && <Badge variant="light">{filtered.length} matches</Badge>}
      </Group>
      <TextInput
        label="Find a tool"
        placeholder="Search by name or description"
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
      />
      {filtered.length ? (
        <Accordion
          multiple
          variant="separated"
          value={term ? [...groups.keys()] : openedGroups}
          onChange={setOpenedGroups}
        >
          {[...groups.entries()].map(([name, items]) => (
            <Accordion.Item value={name} key={name}>
              <Accordion.Control>
                <Group justify="space-between" pr="sm">
                  <Text fw={500} size="sm">
                    {name}
                  </Text>
                  <Badge variant="light" color="gray" size="sm">
                    {items.filter((tool) => tool.enabled).length}/{items.length} enabled
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="lg">
                  {items.map((tool) => (
                    <ToolToggle key={tool.name} tool={tool} update={update} />
                  ))}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      ) : (
        <Text c="dimmed" size="sm">
          No tools match this search. Try another name or keyword.
        </Text>
      )}
    </Section>
  );
}
