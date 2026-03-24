const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const fs = require('fs/promises');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');

const app = express();

app.use(cors({
    origin: 'http://localhost:5274',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '1h';

const DB_HOST = process.env.DB_HOST || 'db';
const DB_PORT = Number(process.env.DB_PORT || 5432);
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const DB_NAME = process.env.DB_NAME || 'hosting';

const SITES_ROOT = path.resolve('/app/hosted-sites');
const APACHE_VHOSTS_FILE = path.resolve('/app/apache-config/httpd-vhosts.conf');

const pool = new Pool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeDomain(domain) {
    return String(domain || '').trim().toLowerCase();
}

function isValidDomain(domain) {
    return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain);
}

function ftpLoginFromDomain(domain) {
    return domain.replace(/[^a-z0-9]/g, '_').slice(0, 32);
}

function generateFtpPassword() {
    return crypto.randomBytes(10).toString('base64url');
}

function buildVhostBlock(domain) {
    return `
# AUTO-GENERATED: ${domain}
<VirtualHost *:80>
    ServerName ${domain}
    DocumentRoot /usr/local/apache2/htdocs/${domain}

    <Directory /usr/local/apache2/htdocs/${domain}>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
`;
}

async function appendVhostIfMissing(domain) {
    const block = buildVhostBlock(domain);
    let content = '';
    try {
        content = await fs.readFile(APACHE_VHOSTS_FILE, 'utf8');
    } catch {
        content = '';
    }

    if (!content.includes(`# AUTO-GENERATED: ${domain}`)) {
        await fs.appendFile(APACHE_VHOSTS_FILE, `\n${block}\n`, 'utf8');
        return true;
    }
    return false;
}

async function removeVhost(domain) {
    let content = '';
    try {
        content = await fs.readFile(APACHE_VHOSTS_FILE, 'utf8');
    } catch {
        return;
    }

    const escaped = domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\n?# AUTO-GENERATED: ${escaped}[\\s\\S]*?<\\/VirtualHost>\\n?`, 'g');
    const next = content.replace(re, '\n');
    if (next !== content) {
        await fs.writeFile(APACHE_VHOSTS_FILE, next, 'utf8');
    }
}

// ─── Auth middleware ─────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'no token provided' });
    }

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'invalid or expired token' });
    }
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
    res.send('backend works');
});

// Register — creates account only, no domain
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body || {};

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'username, email and password are required' });
    }

    try {
        const existing = await pool.query(
            'SELECT id FROM users WHERE email = $1 OR username = $2 LIMIT 1',
            [email, String(username).trim().toLowerCase()]
        );
        if (existing.rows.length) {
            return res.status(409).json({ error: 'email or username already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        await pool.query(
            'INSERT INTO users (username, email, password_hash, created_at) VALUES ($1, $2, $3, NOW())',
            [String(username).trim().toLowerCase(), email, passwordHash]
        );

        return res.status(201).json({ message: 'account created' });
    } catch (err) {
        return res.status(500).json({ error: 'registration failed', details: err.message });
    }
});

// Login — returns JWT token
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body || {};

    if (!username || !password) {
        return res.status(400).json({ error: 'username and password are required' });
    }

    try {
        const result = await pool.query(
            'SELECT id, username, email, password_hash FROM users WHERE username = $1 LIMIT 1',
            [String(username).trim().toLowerCase()]
        );

        if (!result.rows.length) {
            return res.status(401).json({ error: 'invalid username or password' });
        }

        const user = result.rows[0];
        const passwordMatches = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatches) {
            return res.status(401).json({ error: 'invalid username or password' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return res.status(200).json({ message: 'login successful', token });
    } catch (err) {
        return res.status(500).json({ error: 'login failed', details: err.message });
    }
});

// Get all domains for the authenticated user
app.get('/api/domains', requireAuth, async (req, res) => {
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

// Add a new domain for the authenticated user
app.post('/api/domains', requireAuth, async (req, res) => {
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

        const html = `<!doctype html>
<html lang="cs">
<head><meta charset="UTF-8"><title>${normalizedDomain}</title></head>
<body><h1>Webová stránka ${normalizedDomain} byla úspěšně vytvořena!</h1></body>
</html>`;
        await fs.writeFile(path.join(clientDir, 'index.html'), html, 'utf8');
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
        try { await client.query('ROLLBACK'); } catch { }

        if (appendedVhost) {
            try { await removeVhost(normalizedDomain); } catch { }
        }
        if (wroteIndex) {
            try { await fs.unlink(path.join(clientDir, 'index.html')); } catch { }
        }
        if (createdDir) {
            try { await fs.rmdir(clientDir); } catch { }
        }

        return res.status(500).json({ error: 'failed to add domain', details: err.message });
    } finally {
        client.release();
    }
});

// Delete a domain (only owner can delete)
app.delete('/api/domains/:domain', requireAuth, async (req, res) => {
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
        } catch { }

        await client.query('COMMIT');

        return res.status(200).json({ message: 'domain deleted', domain: normalizedDomain });
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch { }
        return res.status(500).json({ error: 'failed to delete domain', details: err.message });
    } finally {
        client.release();
    }
});

// ─── Auto-migration on startup ───────────────────────────────────────────────

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

async function start() {
    await runMigrations();
    app.listen(PORT, () => {
        console.log(`server running on port ${PORT}`);
    });
}

start().catch((err) => {
    console.error('startup failed:', err.message);
    process.exit(1);
});
