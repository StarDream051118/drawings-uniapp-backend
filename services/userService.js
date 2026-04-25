const User = require('../models/user');

class UserService {
    static async updateUsername(user_id, username) {
        const success = await User.updateUsername(user_id, username);
        if (!success) {
            throw new Error('用户名更新失败');
        }
        return { username };
    }

    static async updateGender(user_id, gender) {
        const success = await User.updateGender(user_id, gender);
        if (!success) {
            throw new Error('性别更新失败');
        }
        return { gender };
    }

    static async updateDes(user_id, des) {
        const success = await User.updateDes(user_id, des);
        if (!success) {
            throw new Error('用户描述更新失败');
        }
        return { des };
    }
}

module.exports = UserService;