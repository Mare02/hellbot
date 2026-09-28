const funnyStatuses = require('../data/funnyStatuses');

const ROTATION_INTERVAL_MS = 6 * 60 * 60 * 1000;
let rotationInterval;
let lastStatus;

function chooseStatus() {
  const availableStatuses = funnyStatuses.filter(status => status !== lastStatus);
  const statuses = availableStatuses.length ? availableStatuses : funnyStatuses;

  return statuses[Math.floor(Math.random() * statuses.length)];
}

function updatePresence(client) {
  if (!client.user || !funnyStatuses.length) return;

  lastStatus = chooseStatus();
  client.user.setActivity(lastStatus);
}

function start(client) {
  clearInterval(rotationInterval);
  updatePresence(client);
  rotationInterval = setInterval(() => updatePresence(client), ROTATION_INTERVAL_MS);
  rotationInterval.unref?.();
}

module.exports = { start };
