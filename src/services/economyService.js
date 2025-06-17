const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'economy.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

function runMigrations() {
    // Check and create migrations table if it doesn't exist
    db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY
        );
    `);

    // Get the current version
    let currentVersion = 0;
    const versionRow = db.prepare('SELECT MAX(version) as version FROM schema_migrations').get();
    if (versionRow && versionRow.version) {
        currentVersion = versionRow.version;
    }

    console.log(`Current DB version: ${currentVersion}`);

    const migrationsPath = path.join(__dirname, '..', 'data', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();

    for (const file of migrationFiles) {
        const fileVersion = parseInt(file.split('-')[0], 10);
        if (fileVersion > currentVersion) {
            console.log(`Applying migration: ${file}...`);
            const script = fs.readFileSync(path.join(migrationsPath, file), 'utf-8');

            // Define the transaction
            const migrate = db.transaction(() => {
                db.exec(script);
                db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(fileVersion);
            });

            // Execute the transaction
            try {
                migrate();
                console.log(`Successfully migrated to version ${fileVersion}.`);
            } catch (error) {
                console.error(`!!! MIGRATION FAILED ON VERSION ${fileVersion} !!!`);
                console.error('The database has been rolled back to its state before this migration.');
                console.error('Please fix the failing migration file and restart the bot.');
                console.error('Error:', error.message);
                process.exit(1); // Exit to prevent running with a broken state
            }
        }
    }
}

// Run migrations on startup
runMigrations();

function getUser(userId) {
    let user = db.prepare('SELECT * FROM users WHERE userId = ?').get(userId);
    if (!user) {
        db.prepare('INSERT INTO users (userId) VALUES (?)').run(userId);
        user = db.prepare('SELECT * FROM users WHERE userId = ?').get(userId);
    }
    return user;
}

function updateUser(userId, data) {
    const fields = Object.keys(data).map(field => `${field} = ?`).join(', ');
    const values = Object.values(data);
    values.push(userId);

    const stmt = db.prepare(`UPDATE users SET ${fields} WHERE userId = ?`);
    stmt.run(...values);
}

function getUserInventory(userId) {
    const stmt = db.prepare('SELECT * FROM inventory WHERE userId = ?');
    return stmt.all(userId);
}

function getUserItem(userId, itemId) {
    const stmt = db.prepare('SELECT * FROM inventory WHERE userId = ? AND itemId = ?');
    return stmt.get(userId, itemId);
}

function addItemToUser(userId, itemId, quantity = 1) {
    const existingItem = getUserItem(userId, itemId);
    if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        const stmt = db.prepare('UPDATE inventory SET quantity = ? WHERE userId = ? AND itemId = ?');
        stmt.run(newQuantity, userId, itemId);
    } else {
        const stmt = db.prepare('INSERT INTO inventory (userId, itemId, quantity) VALUES (?, ?, ?)');
        stmt.run(userId, itemId, quantity);
    }
}

function removeItemFromUser(userId, itemId, quantity = 1) {
    const existingItem = getUserItem(userId, itemId);
    if (!existingItem) return; // Nothing to remove

    const newQuantity = existingItem.quantity - quantity;
    if (newQuantity > 0) {
        const stmt = db.prepare('UPDATE inventory SET quantity = ? WHERE userId = ? AND itemId = ?');
        stmt.run(newQuantity, userId, itemId);
    } else {
        const stmt = db.prepare('DELETE FROM inventory WHERE userId = ? AND itemId = ?');
        stmt.run(userId, itemId);
    }
}

function removeAllOfItem(userId, itemId) {
    const stmt = db.prepare('DELETE FROM inventory WHERE userId = ? AND itemId = ?');
    return stmt.run(userId, itemId);
}

function wipeUserInventory(userId) {
    const stmt = db.prepare('DELETE FROM inventory WHERE userId = ?');
    return stmt.run(userId);
}

function getAllCategories() {
    return db.prepare('SELECT * FROM item_categories').all();
}

function getItemsByCategoryId(categoryId) {
    return db.prepare('SELECT * FROM items WHERE category_id = ?').all(categoryId);
}

function getItemById(itemId) {
    return db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
}

function getAllItems() {
    return db.prepare('SELECT * FROM items').all();
}

function getAllUsers() {
    return db.prepare('SELECT * FROM users').all();
}

function getItem(itemId) {
    return db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
}

// --- Investment Functions ---

function getInvestments() {
    return db.prepare('SELECT * FROM investments ORDER BY cost ASC').all();
}

function getInvestmentByName(name) {
    return db.prepare('SELECT * FROM investments WHERE name = ? COLLATE NOCASE').get(name);
}

function getUserInvestments(userId) {
    const sql = `
        SELECT i.id, i.name, i.payout_amount, i.payout_interval_hours, ui.last_payout_date
        FROM user_investments ui
        JOIN investments i ON ui.investment_id = i.id
        WHERE ui.user_id = ?
    `;
    return db.prepare(sql).all(userId);
}

function buyInvestment(userId, investmentId, cost) {
    const now = Date.now();
    const buyTx = db.transaction(() => {
        // Deduct cost from user's souls
        const user = getUser(userId);
        if (user.souls < cost) {
            return { success: false, message: "You don't have enough souls for this investment." };
        }
        updateUser(userId, { souls: user.souls - cost });

        // Add the investment to the user
        db.prepare(
            'INSERT INTO user_investments (user_id, investment_id, purchase_date, last_payout_date) VALUES (?, ?, ?, ?)'
        ).run(userId, investmentId, now, now);

        return { success: true };
    });
    return buyTx();
}

function updateUserInvestments(userId, totalPayout, collectedInvestmentIds) {
     const payoutTx = db.transaction(() => {
        // Add payout to user's wallet
        const user = getUser(userId);
        updateUser(userId, { souls: user.souls + totalPayout });

        // Update last payout date ONLY for the investments that were collected
        const now = Date.now();
        const updateStmt = db.prepare('UPDATE user_investments SET last_payout_date = ? WHERE user_id = ? AND investment_id = ?');

        for (const investmentId of collectedInvestmentIds) {
            updateStmt.run(now, userId, investmentId);
        }
    });
    payoutTx();
}

module.exports = {
    db,
    getUser,
    updateUser,
    getUserInventory,
    getUserItem,
    addItemToUser,
    removeItemFromUser,
    removeAllOfItem,
    wipeUserInventory,
    getAllCategories,
    getItemsByCategoryId,
    getItemById,
    getAllItems,
    getAllUsers,
    getItem,
    getInvestments,
    getInvestmentByName,
    getUserInvestments,
    buyInvestment,
    updateUserInvestments,
};