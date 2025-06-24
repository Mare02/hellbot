const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'economy.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

let ranksCache = null;

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

    let migrationsApplied = false;

    for (const file of migrationFiles) {
        const fileVersion = parseInt(file.split('-')[0], 10);
        if (fileVersion > currentVersion) {
            migrationsApplied = true;
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
    if (!migrationsApplied) {
        console.log('Database is already up to date.');
    }
}

function getRanks() {
    if (!ranksCache) {
        ranksCache = db.prepare('SELECT * FROM ranks ORDER BY netWorth ASC').all();
    }
    return ranksCache;
}

function getUser(userId) {
    let user = db.prepare('SELECT * FROM users WHERE userId = ?').get(userId);
    if (!user) {
        const ranks = getRanks();
        const defaultRank = ranks[0]?.name || 'Imp';
        db.prepare('INSERT INTO users (userId, rank) VALUES (?, ?)').run(userId, defaultRank);
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
        SELECT i.id, i.name, i.payout_amount, i.payout_interval_hours, ui.last_payout_date, i.cost
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

// --- Contract Functions ---

function getAvailableContracts() {
    // Fetches contracts that have not expired yet
    const now = new Date().toISOString();
    return db.prepare('SELECT * FROM contracts WHERE expires_at > ?').all(now);
}

function getContract(contractId) {
    return db.prepare('SELECT * FROM contracts WHERE id = ?').get(contractId);
}

function getUserContracts(userId) {
    const stmt = db.prepare(`
        SELECT c.*, uc.status, uc.id as user_contract_id
        FROM user_contracts uc
        JOIN contracts c ON uc.contract_id = c.id
        WHERE uc.user_id = ?
    `);
    return stmt.all(userId);
}

function getUserContract(userId, contractId) {
    return db.prepare('SELECT * FROM user_contracts WHERE user_id = ? AND contract_id = ?').get(userId, contractId);
}

function getUserContractById(userContractId) {
    return db.prepare('SELECT * FROM user_contracts WHERE id = ?').get(userContractId);
}

function acceptContract(userId, contractId) {
    // Check if the user already has this contract
    const existingContract = getUserContract(userId, contractId);
    if (existingContract) {
        return { success: false, message: 'You have already accepted this contract.' };
    }

    // Check if the contract exists and is available
    const contract = getContract(contractId);
    if (!contract) {
        return { success: false, message: 'This contract does not exist.' };
    }

    const now = new Date().toISOString();
    if (contract.expires_at <= now) {
        return { success: false, message: 'This contract has expired.' };
    }

    db.prepare('INSERT INTO user_contracts (user_id, contract_id) VALUES (?, ?)')
      .run(userId, contractId);

    return { success: true, message: `You have accepted the contract: "${contract.name}".` };
}

function createContract(contract) {
    const { name, description, reward, requirements, expires_at } = contract;
    const stmt = db.prepare(
        'INSERT INTO contracts (name, description, reward, requirements, expires_at) VALUES (?, ?, ?, ?, ?)'
    );
    return stmt.run(name, description, reward, JSON.stringify(requirements), expires_at);
}

function deleteExpiredContracts() {
    const now = new Date().toISOString();
    return db.prepare('DELETE FROM contracts WHERE expires_at <= ?').run(now);
}

function deleteAllContracts() {
    // Use a transaction to delete from both tables
    const deleteAll = db.transaction(() => {
        const userContractsResult = db.prepare('DELETE FROM user_contracts').run();
        const contractsResult = db.prepare('DELETE FROM contracts').run();

        return {
            userContractsDeleted: userContractsResult.changes || 0,
            contractsDeleted: contractsResult.changes || 0,
            totalChanges: (userContractsResult.changes || 0) + (contractsResult.changes || 0)
        };
    });

    return deleteAll();
}

function updateUserContractStatus(userId, contractId, status) {
    const stmt = db.prepare('UPDATE user_contracts SET status = ? WHERE user_id = ? AND contract_id = ?');
    stmt.run(status, userId, contractId);
}

function getUserTotalStats(userId, statType) {
    const inventory = db.prepare(`
        SELECT i.stats, i.unique_item, inv.quantity
        FROM inventory inv
        JOIN items i ON inv.itemId = i.id
        WHERE inv.userId = ? AND i.stats IS NOT NULL
    `).all(userId);

    let totalStat = 0;
    for (const item of inventory) {
        try {
            const stats = JSON.parse(item.stats);
            if (stats[statType]) {
                // Unique items' stats do not stack with quantity.
                if (item.unique_item) {
                    totalStat += stats[statType];
                } else {
                    totalStat += stats[statType] * item.quantity;
                }
            }
        } catch (e) {
            console.error(`Could not parse stats for an item for user ${userId}:`, e);
        }
    }
    return totalStat;
}

function getUserNetWorth(userId) {
    const user = getUser(userId);
    if (!user) return 0;

    const inventory = getUserInventory(userId);
    const itemsValue = inventory.reduce((total, invItem) => {
        const itemDetails = getItemById(invItem.itemId);
        return total + (itemDetails?.value || 0) * invItem.quantity;
    }, 0);

    const userInvestments = getUserInvestments(userId);
    const investmentsValue = userInvestments.reduce((total, inv) => {
        return total + (inv.cost || 0);
    }, 0);

    const totalNetWorth = user.souls + user.bank + itemsValue + investmentsValue;
    const moneyNetWorth = user.souls + user.bank;
    const itemsNetWorth = itemsValue;
    const investmentNetWorth = investmentsValue;

    return {
        totalNetWorth,
        moneyNetWorth,
        itemsNetWorth,
        investmentNetWorth
    };
}

function updateUserNetWorth(userId) {
    const { totalNetWorth } = getUserNetWorth(userId);
    updateUser(userId, { net_worth: totalNetWorth });
    return totalNetWorth;
}

async function updateUserRank(userId, channel) {
    const { totalNetWorth } = getUserNetWorth(userId);
    const user = getUser(userId);

    const ranks = getRanks();
    let newRank = user.rank;
    let rankChanged = false;

    const newRankObj = ranks
        .slice()
        .sort((a, b) => b.netWorth - a.netWorth)
        .find(rank => totalNetWorth >= rank.netWorth);

    if (newRankObj && newRankObj.name !== user.rank) {
        newRank = newRankObj.name;
        rankChanged = true;
    }

    if (rankChanged) {
        updateUser(userId, { rank: newRank });
        if (channel) {
            try {
                const userObject = await channel.client.users.fetch(userId);
                await channel.send(`<@${userId}>, congratulations! You have been promoted to the rank of **${newRank}**!`);
            } catch (error) {
                console.error(`Error sending rank promotion message:`, error);
            }
        }
    }

    return totalNetWorth;
}

module.exports = {
    db,
    runMigrations,
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
    // Contracts
    getAvailableContracts,
    getContract,
    getUserContracts,
    getUserContract,
    getUserContractById,
    acceptContract,
    createContract,
    deleteExpiredContracts,
    deleteAllContracts,
    updateUserContractStatus,
    getUserTotalStats,
    getUserNetWorth,
    updateUserNetWorth,
    updateUserRank,
    getRanks
};
