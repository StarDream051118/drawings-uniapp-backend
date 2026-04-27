require('dotenv').config();

// 全局配置导出
module.exports = {
    port: process.env.PORT || 3002,
    BASE_URL: process.env.BASE_URL || 'http://localhost:3002',
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: process.env.DB_PORT || 3306,
    DB_USER: process.env.DB_USER || 'root',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_DATABASE: process.env.DB_DATABASE || 'drawings',
    env: process.env.NODE_ENV || 'development',
    jwt: {
        secret: process.env.JWT_SECRET || '69NB9gyf0fwm7f7m0eM',
        expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || ''
    },
    email: {
        host: process.env.QQ_EMAIL_HOST || 'smtp.qq.com',
        port: process.env.QQ_EMAIL_PORT || 465,
        user: process.env.QQ_EMAIL_USER || '',
        pass: process.env.QQ_EMAIL_PASS || ''
    },
    codeExpireTime: process.env.CODE_EXPIRE_TIME || 5
};