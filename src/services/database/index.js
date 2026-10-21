const { openDatabase } = require('./connection');
const { migrateDatabase } = require('./migrate');

function initializeDatabase() {
  const database = openDatabase();

  try {
    migrateDatabase(database);
    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}

module.exports = { initializeDatabase };
