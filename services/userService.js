const User = require('../models/user');
const redis = require('../db/redis');

class UserService {
    static async clearProfileCache(user_id) {
        const cacheKey = `profile:${user_id}`;
        try {
            await redis.del(cacheKey);
        } catch (err) {
            console.warn('⚠️ Redis 缓存清除失败：', err.message);
        }
    }

    static async updateUsername(user_id, username) {
        const success = await User.updateUsername(user_id, username);
        if (!success) {
            throw new Error('用户名更新失败');
        }
        await UserService.clearProfileCache(user_id);
        return { username };
    }

    static async updateGender(user_id, gender) {
        const success = await User.updateGender(user_id, gender);
        if (!success) {
            throw new Error('性别更新失败');
        }
        await UserService.clearProfileCache(user_id);
        return { gender };
    }

    static async updateDes(user_id, des) {
        const success = await User.updateDes(user_id, des);
        if (!success) {
            throw new Error('用户描述更新失败');
        }
        await UserService.clearProfileCache(user_id);
        return { des };
    }

    static async searchUsers(keyword) {
        return await User.searchUsers(keyword);
    }

    static async getUserProfile(user_id) {
        const cacheKey = `profile:${user_id}`;
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (err) {
            console.warn('⚠️ Redis 读取失败，降级查询数据库：', err.message);
        }

        const user = await User.findByUserId(user_id);
        if (!user) {
            throw new Error('用户不存在');
        }

        try {
            await redis.setex(cacheKey, 300, JSON.stringify(user));
        } catch (err) {
            console.warn('⚠️ Redis 写入失败：', err.message);
        }

        return user;
    }
}

module.exports = UserService;