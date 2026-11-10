const cron = require('node-cron');
const { randomUUID } = require('node:crypto');
const dailyQuoteJob = require('./jobs/dailyQuoteJob');
const dailyFutureNewsJob = require('./jobs/dailyFutureNewsJob');
const presence = require('./jobs/funnyPresenceJob');
const { withLogContext } = require('./services/logging');

function startJobs(client, runtime) {
  const tasks = [];
  const running = new Set();
  const jobStates = new Map();
  const jobs = [
    ['dailyQuotes', 'dailyQuoteSchedule', dailyQuoteJob],
    ['futureNews', 'futureNewsSchedule', dailyFutureNewsJob],
  ];

  function getStatus() {
    return jobs.map(([feature, scheduleKey]) => {
      const state = jobStates.get(feature) || {};
      return {
        feature,
        enabled: runtime.snapshot.features[feature],
        schedule: runtime.snapshot.behavior[scheduleKey],
        running: running.has(feature),
        lastStartedAt: state.lastStartedAt || null,
        lastCompletedAt: state.lastCompletedAt || null,
        lastDurationMs: state.lastDurationMs ?? null,
        lastOutcome: state.lastOutcome || null,
        failedGuildCount: state.failedGuildCount ?? null,
      };
    });
  }

  function stop() {
    tasks.splice(0).forEach((task) => {
      task.stop();
      cron.getTasks().delete(task.options.name);
    });
    presence.stop();
  }
  function synchronize({ previous, current }) {
    if (!client.isReady()) return;
    if (
      previous &&
      JSON.stringify([previous.features, previous.behavior]) ===
        JSON.stringify([current.features, current.behavior])
    )
      return;
    stop();
    for (const [feature, scheduleKey, job] of jobs) {
      if (!current.features[feature]) continue;
      const schedule = current.behavior[scheduleKey];
      tasks.push(
        cron.schedule(schedule, async () => {
          if (!runtime.snapshot.features[feature] || running.has(feature)) return;
          running.add(feature);
          const runId = randomUUID();
          const startedAt = Date.now();
          const state = jobStates.get(feature) || {};
          state.lastStartedAt = new Date(startedAt).toISOString();
          state.lastOutcome = 'running';
          jobStates.set(feature, state);
          try {
            const result = await withLogContext(
              { component: 'jobs', command: feature, jobRunId: runId },
              () => job.execute()
            );
            state.lastOutcome = result?.failedGuildIds?.length ? 'partial' : 'success';
            state.failedGuildCount = result?.failedGuildIds?.length || 0;
            if (result?.failedGuildIds?.length) {
              withLogContext({ component: 'jobs', command: feature, jobRunId: runId }, () => {
                console.error('Scheduled job completed with delivery failures', {
                  feature,
                  runId,
                  durationMs: Date.now() - startedAt,
                  attemptedGuilds: result.attemptedGuilds,
                  failedGuildCount: result.failedGuildIds.length,
                  failedGuildIds: result.failedGuildIds,
                });
              });
            }
          } catch (error) {
            state.lastOutcome = 'error';
            state.failedGuildCount = null;
            withLogContext({ component: 'jobs', command: feature, jobRunId: runId }, () => {
              console.error('Scheduled job failed', {
                feature,
                runId,
                durationMs: Date.now() - startedAt,
                error,
              });
            });
          } finally {
            state.lastCompletedAt = new Date().toISOString();
            state.lastDurationMs = Date.now() - startedAt;
            running.delete(feature);
          }
        })
      );
    }
    if (current.features.presenceRotation)
      presence.start(client, current.behavior.presenceRotationMinutes);
    else client.user?.setActivity(null);
  }
  const ready = () => synchronize({ current: runtime.snapshot });
  client.on('clientReady', ready);
  const unsubscribe = runtime.onChange(synchronize);
  const stopJobs = () => {
    client.off('clientReady', ready);
    unsubscribe();
    stop();
  };
  stopJobs.getStatus = getStatus;
  return stopJobs;
}

module.exports = { startJobs };
