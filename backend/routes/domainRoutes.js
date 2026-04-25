const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const { getUserPool } = require('../db/pool');
const requireAuth = require('../middleware/authMiddleware');
const { SITES_ROOT } = require('../config/env');
const {
    normalizeDomain,
    isValidDomain,
    ftpLoginFromDomain,
    generateFtpPassword
} = require('../utils/domainUtils');
const {
    appendVhostIfMissing,
    removeVhost,
    writeDefaultIndex
} = require('../services/domainService');

async function createPgRole(db, login, password) {
    const { rows: dbRows } = await db.query('SELECT current_database() AS db');
    const dbName = dbRows[0].db;

    const { rows } = await db.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [login]);
    if (rows.length === 0) {
        await db.query(`CREATE ROLE "${login}" WITH LOGIN PASSWORD '${password}'`);
    } else {
        await db.query(`ALTER ROLE "${login}" WITH PASSWORD '${password}'`);
    }
    await db.query(`GRANT CONNECT ON DATABASE "${dbName}" TO "${login}"`);
    await db.query(`GRANT USAGE ON SCHEMA public TO "${login}"`);
    await db.query(`GRANT SELECT ON domains, ftp_users TO "${login}"`);
}

async function dropPgRole(db, login) {
    const { rows } = await db.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [login]);
    if (!rows.length) return;

    const { rows: dbRows } = await db.query('SELECT current_database() AS db');
    const dbName = dbRows[0].db;

    try { await db.query(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM "${login}"`); } catch {}
    try { await db.query(`REVOKE CONNECT ON DATABASE "${dbName}" FROM "${login}"`); } catch {}
    await db.query(`DROP ROLE IF EXISTS "${login}"`);
}

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
    try {
        const pool = getUserPool(req.user.db_name);
        const result = await pool.query(
            `SELECT d.id, d.domain, d.name, d.description, d.created_at,
                    f.ftp_login, f.ftp_password
             FROM domains d
             LEFT JOIN ftp_users f
               ON f.ftp_login = LEFT(regexp_replace(d.domain, '[^a-z0-9]', '_', 'g'), 32)
               AND f.user_id = d.user_id
             WHERE d.user_id = $1
             ORDER BY d.created_at ASC`,
            [req.user.id]
        );
        return res.status(200).json({ domains: result.rows });
    } catch (err) {
        return res.status(500).json({ error: 'failed to fetch domains', details: err.message });
    }
});

router.post('/', requireAuth, async (req, res) => {
    const { domain, name, description } = req.body || {};
    const normalizedDomain = normalizeDomain(domain);

    if (!normalizedDomain) {
        return res.status(400).json({ error: 'domain is required' });
    }

    if (!isValidDomain(normalizedDomain)) {
        return res.status(400).json({ error: 'invalid domain format' });
    }

    const clientDir = path.join(SITES_ROOT, normalizedDomain);
    if (!clientDir.startsWith(SITES_ROOT)) {
        return res.status(400).json({ error: 'invalid domain path' });
    }

    let createdDir = false;
    let wroteIndex = false;
    let appendedVhost = false;

    let pool;
    try {
        pool = getUserPool(req.user.db_name);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const existingDomain = await client.query(
            'SELECT id FROM domains WHERE domain = $1 LIMIT 1',
            [normalizedDomain]
        );
        if (existingDomain.rows.length) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'domain already exists' });
        }

        await client.query(
            'INSERT INTO domains (user_id, domain, name, description, created_at) VALUES ($1, $2, $3, $4, NOW())',
            [req.user.id, normalizedDomain, name || null, description || null]
        );

        const ftpLogin = ftpLoginFromDomain(normalizedDomain);
        const ftpPassword = generateFtpPassword();
        const ftpDir = `/home/ftpusers/${normalizedDomain}`;

        await client.query(
            `INSERT INTO ftp_users (user_id, ftp_login, ftp_password, ftp_dir, created_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (ftp_login) DO UPDATE SET ftp_password = $3`,
            [req.user.id, ftpLogin, ftpPassword, ftpDir]
        );

        const dirExists = await fs.access(clientDir).then(() => true).catch(() => false);
        if (dirExists) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'domain name is already taken' });
        }

        await fs.mkdir(clientDir, { recursive: false });
        createdDir = true;

        await writeDefaultIndex(clientDir, normalizedDomain);
        wroteIndex = true;

        await fs.chmod(clientDir, 0o777);
        await fs.chmod(path.join(clientDir, 'index.html'), 0o666);

        appendedVhost = await appendVhostIfMissing(normalizedDomain);

        await client.query('COMMIT');

        // PG role is best-effort — domain is already created, don't fail over it
        try {
            await createPgRole(pool, ftpLogin, ftpPassword);
        } catch (roleErr) {
            console.warn('[domain] PG role creation failed (non-fatal):', roleErr.message);
        }

        return res.status(201).json({
            message: 'domain added',
            domain: normalizedDomain,
            name: name || null,
            description: description || null,
            apacheReloadRequired: true,
            ftp: {
                host: 'localhost',
                port: 21,
                login: ftpLogin,
                password: ftpPassword
            }
        });
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch {}

        if (appendedVhost) {
            try { await removeVhost(normalizedDomain); } catch {}
        }
        if (wroteIndex) {
            try { await fs.unlink(path.join(clientDir, 'index.html')); } catch {}
        }
        if (createdDir) {
            try { await fs.rmdir(clientDir); } catch {}
        }

        return res.status(500).json({ error: 'failed to add domain', details: err.message });
    } finally {
        client.release();
    }
});

router.delete('/:domain', requireAuth, async (req, res) => {
    const normalizedDomain = normalizeDomain(req.params.domain);

    if (!normalizedDomain) {
        return res.status(400).json({ error: 'domain is required' });
    }

    const clientDir = path.join(SITES_ROOT, normalizedDomain);
    if (!clientDir.startsWith(SITES_ROOT)) {
        return res.status(400).json({ error: 'invalid domain path' });
    }

    let pool;
    try {
        pool = getUserPool(req.user.db_name);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const existing = await client.query(
            'SELECT id FROM domains WHERE domain = $1 AND user_id = $2 LIMIT 1',
            [normalizedDomain, req.user.id]
        );

        if (!existing.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'domain not found or access denied' });
        }

        const ftpLogin = ftpLoginFromDomain(normalizedDomain);

        await client.query(
            'DELETE FROM ftp_users WHERE ftp_login = $1 AND user_id = $2',
            [ftpLogin, req.user.id]
        );

        await client.query(
            'DELETE FROM domains WHERE domain = $1 AND user_id = $2',
            [normalizedDomain, req.user.id]
        );

        await removeVhost(normalizedDomain);

        try {
            await fs.rm(clientDir, { recursive: true, force: true });
        } catch {}

        await client.query('COMMIT');

        try {
            await dropPgRole(pool, ftpLogin);
        } catch (roleErr) {
            console.warn('[domain] PG role drop failed (non-fatal):', roleErr.message);
        }

        return res.status(200).json({ message: 'domain deleted', domain: normalizedDomain });
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch {}
        return res.status(500).json({ error: 'failed to delete domain', details: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
