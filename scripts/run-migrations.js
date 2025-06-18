const { runMigrations } = require('../src/services/economyService');

console.log('Starting manual database migration...');
try {
    runMigrations();
    console.log('Migrations completed successfully.');
} catch (error) {
    console.error('An error occurred during migration:', error);
    process.exit(1);
}