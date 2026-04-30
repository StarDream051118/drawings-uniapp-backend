const crypto = require('crypto');
const config = require('../config/index');
const redis = require('../db/redis');

class Signature {
    static getSecretKey() {
        return config.jwt.secret;
    }

    static getExpireTime() {
        return 30;
    }

    static generateSigToken(type, user_id) {
        const randomId = crypto.randomBytes(16).toString('hex');
        const timestamp = Date.now();
        const data = `${type}:${user_id}:${timestamp}:${randomId}`;
        const signature = crypto
            .createHmac('sha256', this.getSecretKey())
            .update(data)
            .digest('hex');

        return {
            sig_token: `${data}:${signature}`,
            timestamp,
            randomId
        };
    }

    static async saveSigToken(type, user_id, sigToken, timestamp, randomId) {
        const key = `sig_token:${type}:${user_id}:${randomId}`;
        await redis.setex(key, this.getExpireTime(), sigToken);
    }

    static async verifySigToken(type, user_id, sig_token) {
        const parts = sig_token.split(':');
        if (parts.length !== 5) {
            return { valid: false, msg: '签名令牌格式错误' };
        }

        const [tokenType, tokenUserId, timestamp, randomId, signature] = parts;

        if (tokenType !== type || tokenUserId !== String(user_id)) {
            return { valid: false, msg: '签名令牌不匹配' };
        }

        const now = Date.now();
        if (now - parseInt(timestamp) > this.getExpireTime() * 1000) {
            return { valid: false, msg: '签名令牌已过期' };
        }

        const key = `sig_token:${type}:${user_id}:${randomId}`;
        const exists = await redis.exists(key);
        if (!exists) {
            return { valid: false, msg: '签名令牌已使用或不存在' };
        }

        await redis.del(key);

        return { valid: true };
    }

    static async deleteSigToken(type, user_id, sig_token) {
        const parts = sig_token.split(':');
        if (parts.length !== 5) {
            return;
        }
        const [, , , randomId] = parts;
        const key = `sig_token:${type}:${user_id}:${randomId}`;
        await redis.del(key);
    }
}

module.exports = Signature;