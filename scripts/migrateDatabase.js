require('dotenv').config();
const { initializeDatabase } = require('../src/services/database');

try {
  const database = initializeDatabase();

  try {
    console.log(`Hellbot database initialized: ${database.name}`);
    console.log(`Schema version: ${database.pragma('user_version', { simple: true })}`);
  } finally {
    database.close();
  }
} catch (error) {
  console.error(`Hellbot database initialization failed: ${error.message}`);
  process.exitCode = 1;
}
