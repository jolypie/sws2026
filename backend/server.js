const express = require('express');
const cors = require('cors');
const { PORT } = require('./config/env');
const { runMigrations } = require('./db/migrations');

const authRoutes = require('./routes/authRoutes');
const domainRoutes = require('./routes/domainRoutes');

const app = express();

app.use(cors({
    origin: 'http://localhost:5274',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('backend works');
});

app.use('/api', authRoutes);
app.use('/api/domains', domainRoutes);

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