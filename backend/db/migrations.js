const fs = require('fs/promises');
const pool = require('./pool');

async function runMigrations() {
    const check = await pool.query(`
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'domains'
        )
    `);

    if (!check.rows[0].exists) {
        console.log('[migration] domains table not found, running 001_jwt_multi_domain...');
        const sql = await fs.readFile('/app/db/migrations/001_jwt_multi_domain.sql', 'utf8');
        await pool.query(sql);
        console.log('[migration] done.');
    } else {
        console.log('[migration] schema up to date.');
    }
}

module.exports = { runMigrations };