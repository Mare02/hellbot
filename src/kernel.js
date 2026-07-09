require('dotenv').config();
const cron = require('node-cron');
const { getInstance } = require('./client');
const dailyQuoteJob = require('./jobs/dailyQuoteJob');
const dailyFutureNewsJob = require('./jobs/dailyFutureNewsJob');

const client = getInstance();

client.on('ready', () => {
  cron.schedule('0 8 * * *', () => {
    dailyQuoteJob.execute();
  });

  // cron.schedule('0 18 * * *', () => {
  //   dailyFutureNewsJob.execute();
  // });
});
