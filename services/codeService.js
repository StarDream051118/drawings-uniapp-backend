const redis = require('../db/redis');
const config = require('../config/index');

class CodeService {
    static generateCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    static getCacheKey(email, type) {
        return `email:code:${type}:${email}`;
    }

    static getIntervalKey(email) {
        return `email:interval:${email}`;
    }

    static async sendIntervalCheck(email) {
        const intervalKey = this.getIntervalKey(email);
        const lastSend = await redis.get(intervalKey);
        if (lastSend) {
            const remaining = 60 - (Date.now() - parseInt(lastSend)) / 1000;
            if (remaining > 0) {
                return Math.ceil(remaining);
            }
        }
        return 0;
    }

    static async saveCode(email, type, code) {
        const cacheKey = this.getCacheKey(email, type);
        const intervalKey = this.getIntervalKey(email);
        const expireSeconds = config.codeExpireTime * 60;

        await redis.setex(cacheKey, expireSeconds, code);
        await redis.setex(intervalKey, 60, Date.now().toString());
    }

    static async verifyCode(email, type, code) {
        const cacheKey = this.getCacheKey(email, type);
        const storedCode = await redis.get(cacheKey);

        if (!storedCode) {
            return { valid: false, msg: '验证码已过期' };
        }

        if (storedCode !== code) {
            return { valid: false, msg: '验证码错误' };
        }

        await redis.del(cacheKey);
        return { valid: true };
    }

    static async deleteCode(email, type) {
        const cacheKey = this.getCacheKey(email, type);
        await redis.del(cacheKey);
    }
}

module.exports = CodeService;