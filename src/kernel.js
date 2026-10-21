const cron = require('node-cron');
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
          try {
            await withLogContext({ component: 'jobs', command: feature }, () => job.execute());
          } catch (error) {
            withLogContext({ component: 'jobs', command: feature }, () => {
              console.error('Scheduled job failed', { feature, error });
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
