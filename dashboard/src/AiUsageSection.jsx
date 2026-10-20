import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Code,
  Drawer,
  Group,
  Paper,
  Pagination,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { BarChart } from "@mantine/charts";
import { IconEye, IconRefresh } from "@tabler/icons-react";
import { dateLabel, queryString } from "./api";
import { Empty, ResourceState, Section } from "./components";
import { useResource } from "./useResource";
import "./AiUsageSection.css";

const number = (value) => new Intl.NumberFormat().format(value ?? 0);
const shortNumber = (value) =>
  new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
const DAY_MS = 86400000;
const dateString = (date) => date.toISOString().slice(0, 10);

function dateRange(days) {
  const today = new Date();
  return {
    from: dateString(new Date(today.getTime() - (days - 1) * DAY_MS)),
    to: dateString(today),
  };
}

function utcQuery(filters) {
  return {
    provider: filters.provider,
    model: filters.model,
    from: `${filters.from}T00:00:00.000Z`,
    to: `${filters.to}T23:59:59.999Z`,
  };
}

function outcomeColor(outcome) {
  return outcome === "success"
    ? "green"
    : outcome === "error"
      ? "red"
      : "yellow";
}

function TokenChart({ series, from, to }) {
  const byDate = new Map(series.map((item) => [item.date, item]));
  const days = [];
  for (
    let timestamp = Date.parse(from.slice(0, 10));
    timestamp <= Date.parse(to.slice(0, 10));
    timestamp += DAY_MS
  ) {
    const date = dateString(new Date(timestamp));
    days.push(
      byDate.get(date) || {
        date,
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      },
    );
  }
  return (
    <Stack gap="xs">
      <Group gap="lg">
        <Group gap={6}>
          <span className="ai-usage-key ai-usage-input" />
          <Text size="xs">Input tokens</Text>
        </Group>
        <Group gap={6}>
          <span className="ai-usage-key ai-usage-output" />
          <Text size="xs">Output tokens</Text>
        </Group>
        <Text size="xs" c="dimmed">
          Daily · UTC
        </Text>
      </Group>
      <BarChart
        h={260}
        data={days}
        dataKey="date"
        type="stacked"
        series={[
          {
            name: "inputTokens",
            label: "Input tokens",
            color: "var(--hellbot-ai-usage-input-token-color)",
          },
          {
            name: "outputTokens",
            label: "Output tokens",
            color: "var(--hellbot-ai-usage-output-token-color)",
          },
        ]}
        maxBarWidth={28}
        valueFormatter={shortNumber}
        gridAxis="x"
        tickLine="none"
        xAxisProps={{ tickFormatter: (value) => value.slice(5), minTickGap: 8 }}
        yAxisProps={{ width: 52 }}
        tooltipProps={{
          content: ({ active, label, payload }) => (
            <TokenChartTooltip
              active={active}
              label={label}
              payload={payload}
            />
          ),
        }}
        aria-label="Daily input and output token usage"
      />
    </Stack>
  );
}

function TokenChartTooltip({ active, label, payload }) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;

  return (
    <Paper p="sm" withBorder shadow="md">
      <Stack gap={6}>
        <Text size="xs" fw={600}>
          {label}
        </Text>
        {[
          ["Input tokens", item.inputTokens],
          ["Output tokens", item.outputTokens],
          ["Total tokens", item.totalTokens],
          ["API calls", item.calls],
        ].map(([name, value]) => (
          <div className="ai-usage-tooltip-row" key={name}>
            <span>{name}</span>
            <span className="ai-usage-number">{number(value)}</span>
          </div>
        ))}
      </Stack>
    </Paper>
  );
}

function CallDetail({ profile, id }) {
  const resource = useResource(`/profiles/${profile}/ai-calls/${id}`);
  const data = resource.data;
  return (
    <Stack>
      <ResourceState {...resource} onRetry={resource.refresh} />
      {data && (
        <>
          <Group justify="space-between">
            <Text fw={600}>{data.model || data.operation}</Text>
            <Badge color={outcomeColor(data.outcome)}>{data.outcome}</Badge>
          </Group>
          <Text size="sm" c="dimmed">
            {dateLabel(data.startedAt)} · {data.provider} · Attempt{" "}
            {data.attempt}
          </Text>
          <SimpleGrid cols={2}>
            <Text size="sm">
              Input:{" "}
              {data.inputTokens == null
                ? "Unavailable"
                : `${number(data.inputTokens)} tokens`}
            </Text>
            <Text size="sm">
              Output:{" "}
              {data.outputTokens == null
                ? "Unavailable"
                : `${number(data.outputTokens)} tokens`}
            </Text>
          </SimpleGrid>
          <Text size="xs" c="dimmed">
            Sensitive credentials are redacted. Large payloads may be truncated.
          </Text>
          {[
            [
              "Metadata",
              Object.fromEntries(
                Object.entries(data).filter(
                  ([key]) =>
                    ![
                      "request",
                      "requestHeaders",
                      "response",
                      "responseHeaders",
                      "error",
                    ].includes(key),
                ),
              ),
            ],
            ["Request headers", data.requestHeaders],
            ["Request", data.request],
            ["Response", data.response],
            ["Response headers", data.responseHeaders],
            ["Error", data.error],
          ].map(([title, value]) => (
            <Stack gap="xs" key={title}>
              <Text fw={600} size="sm">
                {title}
              </Text>
              <Code block className="ai-usage-payload">
                {value == null
                  ? "Not available"
                  : JSON.stringify(value, null, 2)}
              </Code>
            </Stack>
          ))}
        </>
      )}
    </Stack>
  );
}

function CallLogs({ profile, filters }) {
  const [outcome, setOutcome] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const resource = useResource(
    `/profiles/${profile}/ai-calls?${queryString({ ...utcQuery(filters), outcome, page, pageSize: 20 })}`,
  );
  return (
    <Stack gap="md">
      <Group justify="space-between" align="end">
        <Stack gap={2}>
          <Group gap="xs">
            <Text fw={600}>API calls</Text>
            {resource.data && (
              <Text size="sm" c="dimmed" className="ai-usage-number">
                {number(resource.data.total)}
              </Text>
            )}
          </Group>
          <Text size="xs" c="dimmed">
            Each provider attempt is logged, including retries and tool
            follow-ups.
          </Text>
        </Stack>
        <Select
          label="Result"
          aria-label="Filter API calls by result"
          w={160}
          value={outcome}
          allowDeselect={false}
          data={[
            { value: "", label: "All results" },
            { value: "success", label: "Success" },
            { value: "error", label: "Error" },
            { value: "pending", label: "Pending" },
          ]}
          onChange={(value) => {
            setOutcome(value ?? "");
            setPage(1);
          }}
        />
      </Group>
      <ResourceState {...resource} onRetry={resource.refresh} />
      {resource.data && (
        <>
          {resource.data.items.length ? (
            <Table.ScrollContainer minWidth={800}>
              <Table verticalSpacing="sm" highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    {[
                      "Started",
                      "Provider / model",
                      "Result",
                      "Tokens",
                      "Duration",
                      "Attempt",
                      "Details",
                    ].map((label) => (
                      <Table.Th key={label}>{label}</Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {resource.data.items.map((item) => (
                    <Table.Tr key={item.id}>
                      <Table.Td>
                        <Text size="xs">{dateLabel(item.startedAt)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={500}>
                          {item.model || item.operation}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {item.provider}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={outcomeColor(item.outcome)}
                          variant="light"
                          size="sm"
                        >
                          {item.outcome}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" className="ai-usage-number">
                          {item.totalTokens == null
                            ? "—"
                            : number(item.totalTokens)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs">
                          {item.durationMs == null
                            ? "—"
                            : `${number(item.durationMs)} ms`}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{item.attempt}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Button
                          variant="subtle"
                          size="xs"
                          leftSection={<IconEye size={14} />}
                          onClick={() => setSelected(item.id)}
                          aria-label={`View API call ${item.id}`}
                        >
                          View
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          ) : (
            <Empty>
              No API calls match these filters. New calls appear after tracking
              is enabled.
            </Empty>
          )}
          <Group justify="flex-end">
            <Pagination
              total={Math.max(1, Math.ceil(resource.data.total / 20))}
              value={page}
              onChange={setPage}
              size="sm"
            />
          </Group>
        </>
      )}
      <Drawer
        opened={selected !== null}
        onClose={() => setSelected(null)}
        title="AI API call details"
        position="right"
        size="xl"
      >
        {selected !== null && (
          <CallDetail
            key={`${profile}:${selected}`}
            profile={profile}
            id={selected}
          />
        )}
      </Drawer>
    </Stack>
  );
}

export default function AiUsageSection({ profile }) {
  const [filters, setFilters] = useState(() => ({
    ...dateRange(7),
    provider: "",
    model: "",
  }));
  const [draft, setDraft] = useState(filters);
  const [period, setPeriod] = useState("7");
  const [revision, setRevision] = useState(0);
  const resource = useResource(
    `/profiles/${profile}/ai-usage?${queryString(utcQuery(filters))}`,
  );
  const dates = dateRange(30);
  const invalid =
    !draft.from ||
    !draft.to ||
    draft.from > draft.to ||
    draft.from < dates.from ||
    draft.to > dates.to;
  const data = resource.data;
  const totals = data?.totals;
  function refresh() {
    resource.refresh();
    setRevision((value) => value + 1);
  }
  return (
    <Section
      title="Token usage & API calls"
      description="Usage reported in Hellbot's API responses. Logs and token history are retained for 30 days, starting when tracking is enabled."
    >
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Select
          label="Period"
          value={period}
          allowDeselect={false}
          data={[
            { value: "7", label: "Last 7 days" },
            { value: "30", label: "Last 30 days" },
            { value: "custom", label: "Custom range" },
          ]}
          onChange={(value) => {
            setPeriod(value);
            if (value !== "custom")
              setDraft((current) => ({
                ...current,
                ...dateRange(Number(value)),
              }));
          }}
        />
        <Select
          label="Provider"
          value={draft.provider}
          searchable
          allowDeselect={false}
          data={[
            { value: "", label: "All providers" },
            ...[
              ...new Set(
                [...(data?.providers || []), draft.provider].filter(Boolean),
              ),
            ].map((value) => ({ value, label: value })),
          ]}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              provider: value ?? "",
              model: "",
            }))
          }
        />
        <Select
          label="Model"
          value={draft.model}
          searchable
          allowDeselect={false}
          data={[
            { value: "", label: "All models" },
            ...[
              ...new Set(
                [...(data?.models || []), draft.model].filter(Boolean),
              ),
            ].map((value) => ({ value, label: value })),
          ]}
          onChange={(value) =>
            setDraft((current) => ({ ...current, model: value ?? "" }))
          }
        />
      </SimpleGrid>
      {period === "custom" && (
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            type="date"
            label="From (UTC)"
            value={draft.from}
            min={dates.from}
            max={draft.to || dates.to}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                from: event.currentTarget.value,
              }))
            }
          />
          <TextInput
            type="date"
            label="To (UTC)"
            value={draft.to}
            min={draft.from || dates.from}
            max={dates.to}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                to: event.currentTarget.value,
              }))
            }
          />
        </SimpleGrid>
      )}
      {invalid && (
        <Text size="xs" c="red">
          Choose a valid date range within the last 30 days.
        </Text>
      )}
      <Group justify="space-between">
        <Text size="xs" c="dimmed">
          Historical usage is independent of the current provider setting.
        </Text>
        <Group gap="xs">
          <Button
            variant="default"
            leftSection={<IconRefresh size={15} />}
            onClick={refresh}
          >
            Refresh
          </Button>
          <Button
            disabled={invalid}
            onClick={() => {
              setFilters({ ...draft });
              refresh();
            }}
          >
            Calculate usage
          </Button>
        </Group>
      </Group>
      <ResourceState {...resource} onRetry={resource.refresh} />
      {totals && (
        <Stack gap="lg">
          <Text size="xs" c="dimmed">
            {filters.from} – {filters.to} · UTC ·{" "}
            {filters.provider || "All providers"} ·{" "}
            {filters.model || "All models"}
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            {[
              ["Total tokens", totals.totalTokens],
              ["Input tokens", totals.inputTokens],
              ["Output tokens", totals.outputTokens],
            ].map(([label, value]) => (
              <Stack gap={2} key={label}>
                <Text size="xs" c="dimmed">
                  {label}
                </Text>
                <Text
                  fw={650}
                  size={label === "Total tokens" ? "xl" : "lg"}
                  className="ai-usage-number"
                >
                  {number(value)}
                </Text>
              </Stack>
            ))}
          </SimpleGrid>
          <Group gap="lg">
            <Text size="xs" c="dimmed">
              Reported cached input:{" "}
              {totals.cachedUsageCalls
                ? number(totals.cachedTokens)
                : "Unavailable"}
            </Text>
            <Text size="xs" c="dimmed">
              Reported reasoning:{" "}
              {totals.reasoningUsageCalls
                ? number(totals.reasoningTokens)
                : "Unavailable"}
            </Text>
            <Text size="xs" c="dimmed">
              Subsets of input / output; never added twice.
            </Text>
          </Group>
          {totals.missingUsageCalls > 0 && (
            <Alert color="yellow" title="Some token counts are unavailable">
              <Text size="sm">
                {number(totals.missingUsageCalls)} completed calls did not
                return token usage. Totals include only provider-reported usage.
              </Text>
            </Alert>
          )}
          {totals.calls ? (
            <TokenChart
              series={data.series}
              from={data.from || filters.from}
              to={data.to || filters.to}
            />
          ) : (
            <Empty>No token usage recorded for this period.</Empty>
          )}
        </Stack>
      )}
      <CallLogs
        key={`${profile}:${queryString(filters)}:${revision}`}
        profile={profile}
        filters={filters}
      />
    </Section>
  );
}
