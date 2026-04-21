const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { mainPool, createUserDatabase } = require('../db/pool');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');

const router = express.Router();

router.post('/register', async (req, res) => {
    const { username, email, password } = req.body || {};

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'username, email and password are required' });
    }

    const cleanUsername = String(username).trim().toLowerCase();

    try {
        const existing = await mainPool.query(
            'SELECT id FROM users WHERE email = $1 OR username = $2 LIMIT 1',
            [email, cleanUsername]
        );
        if (existing.rows.length) {
            return res.status(409).json({ error: 'email or username already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const inserted = await mainPool.query(
            'INSERT INTO users (username, email, password_hash, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
            [cleanUsername, email, passwordHash]
        );

        const userId = inserted.rows[0].id;
        const dbName = `user_${userId}`;

        await createUserDatabase(dbName);

        await mainPool.query(
            'UPDATE users SET db_name = $1 WHERE id = $2',
            [dbName, userId]
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
        const result = await mainPool.query(
            'SELECT id, username, email, password_hash, db_name FROM users WHERE username = $1 LIMIT 1',
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
            { id: user.id, username: user.username, email: user.email, db_name: user.db_name },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return res.status(200).json({ message: 'login successful', token });
    } catch (err) {
        return res.status(500).json({ error: 'login failed', details: err.message });
    }
});

module.exports = router;
