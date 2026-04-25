const { Pool } = require('pg');
const {
    DB_HOST,
    DB_PORT,
    DB_USER,
    DB_PASSWORD,
    DB_NAME
} = require('../config/env');

const mainPool = new Pool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME
});

const MAX_POOLS = 100;
const poolCache = new Map();

function getUserPool(dbName) {
    if (!dbName) throw new Error('user has no personal database assigned — re-register or contact admin');
    if (poolCache.has(dbName)) {
        const entry = poolCache.get(dbName);
        entry.lastUsed = Date.now();
        return entry.pool;
    }

    if (poolCache.size >= MAX_POOLS) {
        let oldest = null;
        let oldestTime = Infinity;
        for (const [name, entry] of poolCache) {
            if (entry.lastUsed < oldestTime) {
                oldestTime = entry.lastUsed;
                oldest = name;
            }
        }
        if (oldest) {
            poolCache.get(oldest).pool.end().catch(() => {});
            poolCache.delete(oldest);
        }
    }

    const pool = new Pool({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: dbName
    });

    poolCache.set(dbName, { pool, lastUsed: Date.now() });
    return pool;
}

// Schema applied to every new user database
const USER_DB_SCHEMA = `
    CREATE TABLE IF NOT EXISTS domains (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL,
        domain      VARCHAR(190) UNIQUE NOT NULL,
        name        VARCHAR(100),
        description TEXT,
        created_at  TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ftp_users (
        id           SERIAL PRIMARY KEY,
        user_id      INTEGER NOT NULL,
        ftp_login    VARCHAR(64) UNIQUE NOT NULL,
        ftp_password VARCHAR(255) NOT NULL,
        ftp_dir      VARCHAR(255) NOT NULL,
        created_at   TIMESTAMP DEFAULT NOW()
    );
`;

async function createUserDatabase(dbName) {
    // CREATE DATABASE cannot run inside a transaction — use a raw client
    const client = await mainPool.connect();
    try {
        await client.query(`CREATE DATABASE "${dbName}"`);
    } finally {
        client.release();
    }

    const userPool = getUserPool(dbName);
    await userPool.query(USER_DB_SCHEMA);
}

async function dropUserDatabase(dbName) {
    if (poolCache.has(dbName)) {
        await poolCache.get(dbName).pool.end().catch(() => {});
        poolCache.delete(dbName);
    }

    const client = await mainPool.connect();
    try {
        // Terminate any remaining connections before dropping
        await client.query(
            `SELECT pg_terminate_backend(pid)
             FROM pg_stat_activity
             WHERE datname = $1 AND pid <> pg_backend_pid()`,
            [dbName]
        );
        await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    } finally {
        client.release();
    }
}

module.exports = { mainPool, getUserPool, createUserDatabase, dropUserDatabase };
