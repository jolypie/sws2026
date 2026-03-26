const fs = require('fs/promises');
const path = require('path');
const { APACHE_VHOSTS_FILE } = require('../config/env');

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

async function writeDefaultIndex(clientDir, normalizedDomain) {
    const html = `<!doctype html>
<html lang="cs">
<head><meta charset="UTF-8"><title>${normalizedDomain}</title></head>
<body><h1>Webová stránka ${normalizedDomain} byla úspěšně vytvořena!</h1></body>
</html>`;
    await fs.writeFile(path.join(clientDir, 'index.html'), html, 'utf8');
}

module.exports = {
    buildVhostBlock,
    appendVhostIfMissing,
    removeVhost,
    writeDefaultIndex
};