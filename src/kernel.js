const cron = require('node-cron');
const { randomUUID } = require('node:crypto');
const dailyQuoteJob = require('./jobs/dailyQuoteJob');
const dailyFutureNewsJob = require('./jobs/dailyFutureNewsJob');
const presence = require('./jobs/funnyPresenceJob');
const { withLogContext } = require('./services/logging');

function startJobs(client, runtime) {
  const tasks = [];
  const running = new Set();

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
    for (const [feature, schedule, job] of [
      ['dailyQuotes', current.behavior.dailyQuoteSchedule, dailyQuoteJob],
      ['futureNews', current.behavior.futureNewsSchedule, dailyFutureNewsJob],
    ]) {
      if (!current.features[feature]) continue;
      tasks.push(
        cron.schedule(schedule, async () => {
          if (!runtime.snapshot.features[feature] || running.has(feature)) return;
          running.add(feature);
          const runId = randomUUID();
          const startedAt = Date.now();
          try {
            const result = await withLogContext(
              { component: 'jobs', command: feature, jobRunId: runId },
              () => job.execute()
            );
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
            withLogContext({ component: 'jobs', command: feature, jobRunId: runId }, () => {
              console.error('Scheduled job failed', {
                feature,
                runId,
                durationMs: Date.now() - startedAt,
                error,
              });
            });
          } finally {
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
  return () => {
    client.off('clientReady', ready);
    unsubscribe();
    stop();
  };
}

module.exports = { startJobs };
