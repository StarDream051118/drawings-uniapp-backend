const pool = require('../db/index');
const config = require('../config/index');

let lastTime = 0;
let seq = 0;

function formatUserData(user) {
    if (!user) return null;
    return {
        ...user,
        avatar_path: user.avatar_path ? `${config.BASE_URL}${user.avatar_path}` : null,
        profile_bg: user.profile_bg ? `${config.BASE_URL}${user.profile_bg}` : null
    };
}

class User {
    // 创建用户
    static async createUser(userAuth) {
        const { account, password, email } = userAuth;
        const formatTime = new Date();
        const sql = 'INSERT INTO users (account, password, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)';
        const [result1] = await pool.execute(sql, [account, password, email, formatTime, formatTime]);
        return {
            id: result1.insertId,
            formatTime: formatTime
        };
    }

    // 创建用户基础信息
    static async createInfo(userData) {
        const { userAuth: { id, formatTime },userId, username } = userData;
        const sql = 'INSERT INTO user_data (id, user_id, username, avatar_path, profile_bg, gender, des, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const [result] = await pool.execute(sql, [id, userId, username, null, null, null, null, formatTime, formatTime]);
        return result.affectedRows;
    }

    // 生成 6 位唯一 user_id（无重复、固定长度）
    static generateUserId() {
        let now = Date.now();

        // 同一毫秒内请求
        if (now === lastTime) {
            seq++;
            // 超过 100 个，等待到下一毫秒
            if (seq > 99) {
                while (Date.now() === lastTime) {
                    // 空循环等待
                }
                now = Date.now();
                seq = 0;
            }
        } else {
            // 新毫秒，重置序号
            seq = 0;
            lastTime = now;
        }

        const base = now % 1000000;
        const id = base * 100 + seq;

        // 保证一定返回 6 位字符串
        return id.toString().padStart(6, '0').slice(-6);
    }

    // 根据账号查找用户
    static async findByAccount(account) {
        const sql = 'SELECT id, email, password FROM users WHERE account = ?';
        const [rows] = await pool.execute(sql, [account]);
        return rows[0];
    }

    // 根据邮箱查找用户
    static async findByEmail(email) {
        const sql = 'SELECT email FROM users WHERE email = ?';
        const [rows] = await pool.execute(sql, [email]);
        return rows[0];
    }

    // 根据UserID查找用户
    static async findByUserId(user_id) {
        const sql = 'SELECT user_id, username, avatar_path, profile_bg, gender, des, created_at FROM user_data WHERE user_id = ?';
        const [rows] = await pool.execute(sql, [user_id]);
        return formatUserData(rows[0]);
    }

    // 根据ID查找用户
    static async findById(id) {
        const sql = 'SELECT user_id, username, avatar_path, profile_bg, gender, des, created_at FROM user_data WHERE id = ?';
        const [rows] = await pool.execute(sql, [id]);
        return formatUserData(rows[0]);
    }

    // 根据UserID查找用户（包含邮箱）
    static async findUserByUserId(user_id) {
        const userDataSql = 'SELECT id, user_id, username, avatar_path, profile_bg, gender, des FROM user_data WHERE user_id = ?';
        const [userDataRows] = await pool.execute(userDataSql, [user_id]);
        if (!userDataRows[0]) {
            return null;
        }
        const { id } = userDataRows[0];
        const userSql = 'SELECT email FROM users WHERE id = ?';
        const [userRows] = await pool.execute(userSql, [id]);
        if (!userRows[0]) {
            return null;
        }
        return formatUserData({
            ...userDataRows[0],
            email: userRows[0].email
        });
    }

    // 更新用户名
    static async updateUsername(user_id, username) {
        const sql = 'UPDATE user_data SET username = ?, updated_at = ? WHERE user_id = ?';
        const formatTime = new Date();
        const [result] = await pool.execute(sql, [username, formatTime, user_id]);
        return result.affectedRows > 0;
    }

    // 更新性别
    static async updateGender(user_id, gender) {
        const sql = 'UPDATE user_data SET gender = ?, updated_at = ? WHERE user_id = ?';
        const formatTime = new Date();
        const [result] = await pool.execute(sql, [gender, formatTime, user_id]);
        return result.affectedRows > 0;
    }

    // 更新用户描述
    static async updateDes(user_id, des) {
        const sql = 'UPDATE user_data SET des = ?, updated_at = ? WHERE user_id = ?';
        const formatTime = new Date();
        const [result] = await pool.execute(sql, [des, formatTime, user_id]);
        return result.affectedRows > 0;
    }

    // 搜索用户（用户名模糊 + user_id 精确）
    static async searchUsers(keyword) {
        const likeKeyword = `%${keyword}%`;
        const sql = 'SELECT user_id, username, avatar_path FROM user_data WHERE username LIKE ? OR user_id = ? LIMIT 20';
        const [rows] = await pool.execute(sql, [likeKeyword, keyword]);
        return rows.map(row => formatUserData(row));
    }

    // 更新密码
    static async updatePassword(email, newPassword) {
        const sql = 'UPDATE users SET password = ?, updated_at = ? WHERE email = ?';
        const formatTime = new Date();
        const [result] = await pool.execute(sql, [newPassword, formatTime, email]);
        return result.affectedRows > 0;
    }
}

module.exports = User;