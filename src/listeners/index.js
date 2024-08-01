const fs = require('fs');

const listenerFiles = fs.readdirSync(__dirname).filter(file => file.endsWith('.js') && file !== 'index.js');

const listeners = listenerFiles.reduce((listeners, file) => {
  const listenerName = file.split('.')[0];
  listeners[listenerName] = require(`./${file}`);
  return listeners;
}, {});

module.exports = listeners;
