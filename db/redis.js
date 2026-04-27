const Redis = require('ioredis');
const config = require('../config/index');

const redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    retryStrategy: (times) => {
        if (times > 3) {
            return null;
        }
        return Math.min(times * 100, 3000);
    }
});

redis.on('connect', () => {
    console.log('✅ Redis 连接成功');
});

redis.on('error', (err) => {
    console.error('❌ Redis 连接失败：', err.message);
});

module.exports = redis;