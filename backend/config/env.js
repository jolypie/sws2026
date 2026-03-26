const path = require('path');

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

module.exports = {
    PORT,
    JWT_SECRET,
    JWT_EXPIRES_IN,
    DB_HOST,
    DB_PORT,
    DB_USER,
    DB_PASSWORD,
    DB_NAME,
    SITES_ROOT,
    APACHE_VHOSTS_FILE
};