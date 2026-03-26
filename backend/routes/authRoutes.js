const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');

const router = express.Router();

router.post('/register', async (req, res) => {
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

router.post('/login', async (req, res) => {
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

module.exports = router;