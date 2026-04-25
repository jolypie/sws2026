const { mainPool } = require('./pool');

async function runMigrations() {
    await mainPool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id            SERIAL PRIMARY KEY,
            username      VARCHAR(50)  UNIQUE NOT NULL,
            email         VARCHAR(190) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            db_name       VARCHAR(64)  UNIQUE,
            created_at    TIMESTAMP DEFAULT NOW()
        )
    `);

    await mainPool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS db_name VARCHAR(64) UNIQUE
    `);

    console.log('[migration] main schema up to date.');
}

module.exports = { runMigrations };
