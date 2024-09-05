require('dotenv').config();
const cron = require('node-cron');
const { getInstance } = require('./client');
const dailyFactJob = require('./jobs/dailyFactJob');

const client = getInstance();

client.on('ready', () => {
  cron.schedule('0 12 * * *', () => {
    dailyFactJob.execute();
  });
});
