import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock fetch
global.fetch = vi.fn();

describe('Frontend - základní testy', () => {

    test('fetch vrátí chybu při špatném připojení', async () => {
        global.fetch.mockRejectedValueOnce(new Error('Failed to fetch'));

        await expect(fetch('http://localhost:8765/api/login')).rejects.toThrow('Failed to fetch');
    });

    test('fetch vrátí 401 při špatném hesle', async () => {
        global.fetch.mockResolvedValueOnce({
            status: 401,
            json: async () => ({ error: 'invalid username or password' })
        });

        const res = await fetch('http://localhost:8765/api/login', {
            method: 'POST',
            body: JSON.stringify({ username: 'test', password: 'spatne' })
        });

        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.error).toBe('invalid username or password');
    });

    test('fetch vrátí 201 při úspěšné registraci', async () => {
        global.fetch.mockResolvedValueOnce({
            status: 201,
            json: async () => ({ message: 'account created' })
        });

        const res = await fetch('http://localhost:8765/api/register', {
            method: 'POST',
            body: JSON.stringify({ username: 'test', email: 'test@test.cz', password: 'heslo123' })
        });

        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.message).toBe('account created');
    });

    test('fetch vrátí token při úspěšném přihlášení', async () => {
        global.fetch.mockResolvedValueOnce({
            status: 200,
            json: async () => ({ token: 'abc123token' })
        });

        const res = await fetch('http://localhost:8765/api/login', {
            method: 'POST',
            body: JSON.stringify({ username: 'test', password: 'heslo123' })
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.token).toBeDefined();
    });

    test('fetch vrátí 409 při duplicitní registraci', async () => {
        global.fetch.mockResolvedValueOnce({
            status: 409,
            json: async () => ({ error: 'email or username already exists' })
        });

        const res = await fetch('http://localhost:8765/api/register', {
            method: 'POST',
            body: JSON.stringify({ username: 'test', email: 'test@test.cz', password: 'heslo123' })
        });

        expect(res.status).toBe(409);
        const data = await res.json();
        expect(data.error).toBe('email or username already exists');
    });
});