const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const pool = require('../db/pool');
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

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
    try {
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

        await fs.mkdir(clientDir, { recursive: false });
        createdDir = true;

        await writeDefaultIndex(clientDir, normalizedDomain);
        wroteIndex = true;

        appendedVhost = await appendVhostIfMissing(normalizedDomain);

        await client.query('COMMIT');

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

        await client.query(
            'DELETE FROM ftp_users WHERE ftp_login = $1 AND user_id = $2',
            [ftpLoginFromDomain(normalizedDomain), req.user.id]
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

        return res.status(200).json({ message: 'domain deleted', domain: normalizedDomain });
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch {}
        return res.status(500).json({ error: 'failed to delete domain', details: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;