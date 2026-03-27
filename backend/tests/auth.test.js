const request = require('supertest');
const express = require('express');
const bcrypt = require('bcrypt');

// Mock databáze
jest.mock('../db/pool', () => ({
    query: jest.fn()
}));

jest.mock('../config/env', () => ({
    JWT_SECRET: 'test_secret',
    JWT_EXPIRES_IN: '1h'
}));

const pool = require('../db/pool');
const authRoutes = require('../routes/authRoutes');

const app = express();
app.use(express.json());
app.use('/api', authRoutes);

describe('AUTH - Registrace', () => {
    beforeEach(() => jest.clearAllMocks());

    test('Úspěšná registrace vrátí 201', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] });

        const res = await request(app).post('/api/register').send({
            username: 'testuser',
            email: 'test@test.cz',
            password: 'heslo123'
        });

        expect(res.statusCode).toBe(201);
        expect(res.body.message).toBe('account created');
    });

    test('Chybějící údaje vrátí 400', async () => {
        const res = await request(app).post('/api/register').send({
            username: 'testuser'
        });

        expect(res.statusCode).toBe(400);
    });

    test('Duplicitní uživatel vrátí 409', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

        const res = await request(app).post('/api/register').send({
            username: 'testuser',
            email: 'test@test.cz',
            password: 'heslo123'
        });

        expect(res.statusCode).toBe(409);
    });
});

describe('AUTH - Přihlášení', () => {
    beforeEach(() => jest.clearAllMocks());

    test('Přihlášení se špatným heslem vrátí 401', async () => {
        const hash = await bcrypt.hash('spravneheslo', 12);
        pool.query.mockResolvedValueOnce({
            rows: [{ id: 1, username: 'testuser', email: 'test@test.cz', password_hash: hash }]
        });

        const res = await request(app).post('/api/login').send({
            username: 'testuser',
            password: 'spatneheslo'
        });

        expect(res.statusCode).toBe(401);
    });

    test('Přihlášení neexistujícího uživatele vrátí 401', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });

        const res = await request(app).post('/api/login').send({
            username: 'neexistuje',
            password: 'heslo123'
        });

        expect(res.statusCode).toBe(401);
    });

    test('Úspěšné přihlášení vrátí token', async () => {
        const hash = await bcrypt.hash('heslo123', 12);
        pool.query.mockResolvedValueOnce({
            rows: [{ id: 1, username: 'testuser', email: 'test@test.cz', password_hash: hash }]
        });

        const res = await request(app).post('/api/login').send({
            username: 'testuser',
            password: 'heslo123'
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.token).toBeDefined();
    });
});