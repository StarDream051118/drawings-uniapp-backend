const User = require('../models/user');
const { hashPassword, comparePassword } = require('../utils/bcrypt');
const { generateToken, verifyToken } = require('../utils/jwt');

class AuthService {
    // 验证登录状态
    static async verifyToken(token) {
        const decoded = verifyToken(token);
        if (!decoded || !decoded.user_id) {
            return { valid: false };
        }
        const user = await User.findByUserId(decoded.user_id);
        if (!user) {
            return { valid: false };
        }
        return { valid: true, user_id: decoded.user_id };
    }

    // 用户注册
    static async register(userData) {
        const { username, account, password, email } = userData;

        // 1.账号检查
        const existingUserByAccount = await User.findByAccount(account);
        if (existingUserByAccount) {
            throw new Error('账号已被注册');
        }

        // 2.邮箱检查
        const existingUserByEmail = await User.findByEmail(email);
        if (existingUserByEmail) {
            throw new Error('邮箱已被注册');
        }

        // 3.加密密码
        const hashedPassword = await hashPassword(password);

        // 4.创建用户验证
        const userAuth = await User.createUser({
            account,
            password: hashedPassword,
            email
        })
        const userId = await User.generateUserId();
        // 5.创建用户初始信息
        const userInfo = await User.createInfo({
            userAuth,
            userId,
            username
        })

        // 6.验证插入
        if (userInfo !== 1){
            throw new Error('用户基础信息插入错误');
        }

        // 7.获取用户信息
        const user = await User.findByUserId(String(userId));

        // 8.生成JWT令牌
        const token = generateToken(user);

        return {
            user,
            token
        }
    }

    // 用户登录
    static async login(userData) {
        const { account, password } = userData;

        const existingUserByAccount = await User.findByAccount(account);
        if (!existingUserByAccount) {
            throw new Error("用户不存在");
        }
        const { id, password: hashedPassword } = existingUserByAccount
        const checkUserPassword = await comparePassword(password, hashedPassword);
        if (!checkUserPassword) {
            throw new Error("密码错误");
        }
        if (!id) {
            throw new Error("ID不存在!");
        }
        const user = await User.findById(id);
        const token = generateToken(user);
        return {
            user,
            token
        }
    }

    // 重置密码
    static async resetPassword(email, newPassword) {
        const hashedPassword = await hashPassword(newPassword);
        const success = await User.updatePassword(email, hashedPassword);
        if (!success) {
            throw new Error('密码重置失败');
        }
        return { email };
    }
}

module.exports = AuthService;
