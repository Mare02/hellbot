const funnyStatuses = require('../data/funnyStatuses');
const { withLogContext } = require('../services/logging');

let rotationInterval;
let lastStatus;

function chooseStatus() {
  const availableStatuses = funnyStatuses.filter(status => status !== lastStatus);
  const statuses = availableStatuses.length ? availableStatuses : funnyStatuses;

  return statuses[Math.floor(Math.random() * statuses.length)];
}

function updatePresence(client) {
  if (!client.user || !funnyStatuses.length) return;

  try {
    lastStatus = chooseStatus();
    client.user.setActivity(lastStatus);
  } catch (error) {
    withLogContext({ component: 'jobs', command: 'presenceRotation' }, () => {
      console.error('Presence rotation failed.', { error });
    });
  }
}

function start(client, minutes = 360) {
  clearInterval(rotationInterval);
  updatePresence(client);
  rotationInterval = setInterval(() => updatePresence(client), minutes * 60 * 1000);
  rotationInterval.unref?.();
}

function stop() {
  clearInterval(rotationInterval);
  rotationInterval = undefined;
}

module.exports = { start, stop };
