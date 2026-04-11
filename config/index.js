require('dotenv').config();

// 全局配置导出
module.exports = {
    port: process.env.PORT || 3002,
    env: process.env.NODE_ENV || 'development',
    jwt: {
        secret: process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_this_in_production',
        expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    }
};