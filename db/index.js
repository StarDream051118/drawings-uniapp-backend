const mysql = require('mysql2/promise');
const config = require('../config/index');

const pool = mysql.createPool({
    host: config.DB_HOST || 'localhost',
    port: config.DB_PORT || 3306,
    user: config.DB_USER || 'root',
    password: config.DB_PASSWORD || '',
    database: config.DB_DATABASE || 'drawings',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
});

module.exports = pool;