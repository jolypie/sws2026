const crypto = require('crypto');

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

module.exports = {
    normalizeDomain,
    isValidDomain,
    ftpLoginFromDomain,
    generateFtpPassword
};