const express = require('express');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const fs = require('fs/promises');
const path = require('path');
const cors = require('cors');

const app = express();

app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

const PORT = process.env.PORT || 5000;

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

function normalizeDomain(domain) {
    return String(domain || '').trim().toLowerCase();
}

function isValidDomain(domain) {
    return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain);
}

function ftpLoginFromDomain(domain) {
    return domain.replace(/[^a-z0-9]/g, '_').slice(0, 32);
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

app.get('/', (req, res) => {
    res.send('backend works');
});

app.post('/api/register', async (req, res) => {
    const { username, email, password, domain } = req.body || {};
    const normalizedDomain = normalizeDomain(domain);

    if (!username || !email || !password || !normalizedDomain) {
        return res.status(400).json({ error: 'username, email, password, domain are required' });
    }

    if (!isValidDomain(normalizedDomain)) {
        return res.status(400).json({ error: 'invalid domain format' });
    }

    const clientDir = path.join(SITES_ROOT, normalizedDomain);
    if (!clientDir.startsWith(SITES_ROOT)) {
        return res.status(400).json({ error: 'invalid domain path' });
    }

    const ftpLogin = ftpLoginFromDomain(normalizedDomain);
    const ftpPassword = password;
    const passwordHash = await bcrypt.hash(password, 12);

    let createdDir = false;
    let wroteIndex = false;
    let appendedVhost = false;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const existingUser = await client.query(
            'SELECT id FROM users WHERE email = $1 OR username = $2 LIMIT 1',
            [email, username]
        );
        if (existingUser.rows.length) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'email or username already exists' });
        }

        const existingDomain = await client.query(
            'SELECT id FROM users WHERE domain = $1 LIMIT 1',
            [normalizedDomain]
        );
        if (existingDomain.rows.length) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'domain already exists' });
        }

        await client.query(
            'INSERT INTO users (username, email, password_hash, domain, created_at) VALUES ($1, $2, $3, $4, NOW())',
            [username, email, passwordHash, normalizedDomain]
        );

        await client.query(
            'INSERT INTO ftp_users (ftp_login, ftp_password, ftp_dir, created_at) VALUES ($1, $2, $3, NOW())',
            [ftpLogin, ftpPassword, `/home/ftpusers/${normalizedDomain}`]
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
            message: 'Client site created',
            domain: normalizedDomain,
            ftpLogin,
            apacheReloadRequired: true
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

        return res.status(500).json({ error: 'registration failed', details: err.message });
    } finally {
        client.release();
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body || {};

    if (!username || !password) {
        return res.status(400).json({ error: 'username and password are required' });
    }

    try {
        const result = await pool.query(
            'SELECT id, username, email, password_hash, domain FROM users WHERE username = $1 LIMIT 1',
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

        return res.status(200).json({
            message: 'login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                domain: user.domain
            }
        });
    } catch (err) {
        return res.status(500).json({ error: 'login failed', details: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`[server works on port: ${PORT}](http://_vscodecontentref_/3)`);
});