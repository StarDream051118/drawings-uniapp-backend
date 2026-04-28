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

    static getRetryKey(email, type) {
        return `email:retry:${type}:${email}`;
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
        const retryKey = this.getRetryKey(email, type);
        const expireSeconds = config.codeExpireTime * 60;

        await redis.setex(cacheKey, expireSeconds, code);
        await redis.setex(intervalKey, 60, Date.now().toString());
        await redis.del(retryKey);
    }

    static async verifyCode(email, type, code) {
        const cacheKey = this.getCacheKey(email, type);
        const retryKey = this.getRetryKey(email, type);
        const storedCode = await redis.get(cacheKey);

        if (!storedCode) {
            return { valid: false, msg: '验证码已过期' };
        }

        const retryCount = parseInt(await redis.get(retryKey)) || 0;
        if (retryCount >= config.maxRetryCount) {
            await redis.del(cacheKey);
            await redis.del(retryKey);
            return { valid: false, msg: '错误次数过多，请重新获取验证码' };
        }

        if (storedCode !== code) {
            await redis.incr(retryKey);
            await redis.expire(retryKey, config.codeExpireTime * 60);
            return { valid: false, msg: '验证码错误' };
        }

        await redis.del(cacheKey);
        await redis.del(retryKey);
        return { valid: true };
    }

    static async deleteCode(email, type) {
        const cacheKey = this.getCacheKey(email, type);
        const retryKey = this.getRetryKey(email, type);
        await redis.del(cacheKey);
        await redis.del(retryKey);
    }
}

module.exports = CodeService;