const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

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

module.exports = requireAuth;