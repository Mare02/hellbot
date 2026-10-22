import '@mantine/charts/styles.css';
import { Heatmap } from '@mantine/charts';
import { Alert, Badge, Grid, Group, ScrollArea, Select, Stack, Table, Text, Code } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { useSearchParams } from 'react-router-dom';
import { Empty, ResourceState, Section } from '../components';
import { useResource } from '../useResource';

const heatColors = [
  '#9be9a8',
  '#40c463',
  '#30a14e',
  '#216e39',
];

export default function CodeUpdatesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentYear = new Date().getUTCFullYear();
  const requestedYear = Number(searchParams.get('year'));
  const year = Number.isInteger(requestedYear) && requestedYear >= 1970 && requestedYear <= currentYear
    ? requestedYear : currentYear;
  const resource = useResource(`/project/commits?year=${year}`);
  const { ref: heatmapContainerRef, width: heatmapContainerWidth } = useElementSize();
  const data = resource.data;
  const heatmapData = Object.fromEntries(Object.entries(data?.days || {}).filter(([, count]) => count > 0));
  const maxDailyCommits = data?.maxDailyCommits ?? Math.max(0, ...Object.values(data?.days || {}));
  const heatmapStart = data ? new Date(`${data.startDate}T00:00:00Z`) : null;
  const heatmapEnd = data ? new Date(`${data.endDate}T00:00:00Z`) : null;
  const heatmapDays = data ? Math.round((heatmapEnd - heatmapStart) / 86_400_000) + 1 : 0;
  const firstWeekOffset = heatmapStart ? (heatmapStart.getUTCDay() + 6) % 7 : 0;
  const heatmapWeeks = Math.ceil((firstWeekOffset + heatmapDays) / 7);
  const heatmapRectSize = heatmapContainerWidth
    ? Math.max(8, Math.min(13, Math.floor((heatmapContainerWidth - 33) / heatmapWeeks - 3)))
    : 13;
  const longestStreakLabel = data
    ? `${data.longestStreak} ${data.longestStreak === 1 ? 'day' : 'days'}`
    : '—';

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <Stack gap={4}>
          <Text fw={600}>Development activity</Text>
          <Text size="sm" c="dimmed">Commit history for this project's current checkout. Dates are shown in UTC.</Text>
        </Stack>
        <Select
          label="Year"
          aria-label="Commit year"
          w={120}
          value={String(year)}
          allowDeselect={false}
          data={(data?.years || [year]).map((value) => String(value))}
          onChange={(value) => {
            if (!value) return;
            setSearchParams((current) => {
              const next = new URLSearchParams(current);
              next.set('year', value);
              return next;
            });
          }}
        />
      </Group>
      <ResourceState {...resource} onRetry={resource.refresh} />
      {data && (
        <>
          {data.shallow && (
            <Alert color="yellow" title="Partial Git history">
              This checkout has a shallow history. Only locally available commits are included.
            </Alert>
          )}
          <Section title="Commits" description={`Activity on ${data.branch === 'HEAD' ? 'the current detached checkout' : data.branch}, including merged commits.`}>
            <Group gap="xs">
              <Badge variant="light" color="gray" style={{ textTransform: 'none' }}>
                {data.branch === 'HEAD' ? 'Detached HEAD' : data.branch}
              </Badge>
              <Text size="xs" c="dimmed">{data.startDate} – {data.endDate} · {data.timezone}</Text>
            </Group>
            <Grid gutter="lg" align="center">
              <Grid.Col span={{ base: 12, md: 8 }}>
                <div ref={heatmapContainerRef} style={{ width: '100%', minWidth: 0 }}>
                  <ScrollArea type="auto" offsetScrollbars>
                    <Heatmap
                      data={heatmapData}
                      startDate={data.startDate}
                      endDate={data.endDate}
                      colors={heatColors}
                      domain={[1, Math.max(2, maxDailyCommits)]}
                      rectSize={heatmapRectSize}
                      gap={3}
                      rectRadius={3}
                      withMonthLabels
                      withWeekdayLabels
                      withOutsideDates={false}
                      withTooltip
                      withLegend
                      aria-label={`Daily commits for ${year}: ${data.total} commits across ${data.activeDays} active days`}
                      role="img"
                      getTooltipLabel={({ date, value }) => `${date} · ${value || 0} commit${value === 1 ? '' : 's'}`}
                    />
                  </ScrollArea>
                </div>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Stack gap="xs">
                  {[
                    ['Total commits', data.total],
                    ['Busiest month', data.busiestMonth],
                    ['Longest streak', longestStreakLabel],
                  ].map(([label, value]) => (
                    <Group key={label} justify="space-between" gap="sm" wrap="nowrap">
                      <Text size="xs" c="dimmed">{label}</Text>
                      <Text size="sm" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {typeof value === 'number' ? value.toLocaleString() : value}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </Grid.Col>
            </Grid>
            {data.total === 0 && <Text size="sm" c="dimmed">No commits in this year.</Text>}
          </Section>
          <Section title="Recent commits" description={`Up to 20 most recent commits in ${year}.`}>
            {data.recentCommits.length ? (
              <Table.ScrollContainer minWidth={600}>
                <Table verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Commit</Table.Th>
                      <Table.Th>Message</Table.Th>
                      <Table.Th>Date (UTC)</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {data.recentCommits.map((commit) => (
                      <Table.Tr key={commit.hash}>
                        <Table.Td><Code title={commit.hash}>{commit.hash.slice(0, 7)}</Code></Table.Td>
                        <Table.Td><Text size="sm" style={{ overflowWrap: 'anywhere' }}>{commit.subject}</Text></Table.Td>
                        <Table.Td><Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>{commit.date}</Text></Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            ) : <Empty>No commits to show.</Empty>}
          </Section>
        </>
      )}
    </Stack>
  );
}
