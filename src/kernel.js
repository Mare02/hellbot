require('dotenv').config();
const cron = require('node-cron');
const { getInstance } = require('./client');
const dailyFactJob = require('./jobs/dailyFactJob');
const onThisDayCommand = require('./commands/onthisday');
const { dailyContractsJob } = require('./jobs/dailyContractsJob');

const client = getInstance();

client.on('ready', () => {
  if (client.user.id !== config.bot.appId) {
    return;
  }

  cron.schedule('0 18 * * *', () => {
    dailyFactJob.execute();
  });

  cron.schedule('0 12 * * *', () => {
    onThisDayCommand.execute(null, [], true);
  });

  // Schedule the daily contracts job
  dailyContractsJob.schedule();
});
