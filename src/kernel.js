require('dotenv').config();
const cron = require('node-cron');
const { getInstance } = require('./client');
// const dailyFactJob = require('./jobs/dailyFactJob');
const dailyQuoteJob = require('./jobs/dailyQuoteJob');
const onThisDayCommand = require('./commands/onthisday');

const client = getInstance();

client.on('ready', () => {
  // cron.schedule('0 18 * * *', () => {
  //   dailyFactJob.execute();
  // });

  cron.schedule('0 8 * * *', () => {
    dailyQuoteJob.execute();
  });

  cron.schedule('0 12 * * *', () => {
    onThisDayCommand.execute(null, [], true);
  });
});
