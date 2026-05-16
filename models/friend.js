const pool = require('../db/index');
const config = require('../config/index');

function formatAvatar(avatarPath) {
    if (!avatarPath) return null;
    return avatarPath.startsWith('http') ? avatarPath : `${config.BASE_URL}${avatarPath}`;
}

function formatUserData(user) {
    if (!user) return null;
    return {
        ...user,
        avatar_path: formatAvatar(user.avatar_path)
    };
}

class Friend {
    // 创建好友请求
    static async createRequest(senderId, receiverId) {
        const sql = 'INSERT INTO friend_requests (sender_id, receiver_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)';
        const now = new Date();
        const [result] = await pool.execute(sql, [senderId, receiverId, 'pending', now, now]);
        return result.insertId;
    }

    // 检查是否已有待处理请求（防重复）
    static async getPendingRequest(senderId, receiverId) {
        const sql = 'SELECT id, status, created_at FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = ?';
        const [rows] = await pool.execute(sql, [senderId, receiverId, 'pending']);
        return rows[0] || null;
    }

    // 检查反向是否有待处理请求（对方已给我发请求）
    static async getReversePendingRequest(senderId, receiverId) {
        const sql = 'SELECT id, status FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = ?';
        const [rows] = await pool.execute(sql, [receiverId, senderId, 'pending']);
        return rows[0] || null;
    }

    // 检查被拒绝的请求（用于冷却期判断）
    static async getRejectedRequest(senderId, receiverId) {
        const sql = 'SELECT id, status, updated_at FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = ?';
        const [rows] = await pool.execute(sql, [senderId, receiverId, 'rejected']);
        return rows[0] || null;
    }

    // 根据ID获取请求详情
    static async getRequestById(requestId) {
        const sql = 'SELECT id, sender_id, receiver_id, status, created_at, updated_at FROM friend_requests WHERE id = ?';
        const [rows] = await pool.execute(sql, [requestId]);
        return rows[0] || null;
    }

    // 获取用户收到的所有请求（含发送者信息）
    static async getReceivedRequests(userId) {
        const sql = `
            SELECT fr.id, fr.sender_id, fr.status, fr.created_at, fr.updated_at,
                   ud.user_id, ud.username, ud.avatar_path
            FROM friend_requests fr
            JOIN user_data ud ON fr.sender_id = ud.user_id
            WHERE fr.receiver_id = ?
            ORDER BY fr.created_at DESC
        `;
        const [rows] = await pool.execute(sql, [userId]);
        return rows.map(row => ({
            id: row.id,
            user_id: row.user_id,
            username: row.username,
            avatar_path: formatAvatar(row.avatar_path),
            status: row.status,
            created_at: row.created_at,
            updated_at: row.updated_at
        }));
    }

    // 获取用户发送的请求（含接收者信息）
    static async getSentRequests(userId) {
        const sql = `
            SELECT fr.id, fr.receiver_id, fr.status, fr.created_at, fr.updated_at,
                   ud.user_id, ud.username, ud.avatar_path
            FROM friend_requests fr
            JOIN user_data ud ON fr.receiver_id = ud.user_id
            WHERE fr.sender_id = ?
            ORDER BY fr.created_at DESC
        `;
        const [rows] = await pool.execute(sql, [userId]);
        return rows.map(row => ({
            id: row.id,
            user_id: row.user_id,
            username: row.username,
            avatar_path: formatAvatar(row.avatar_path),
            status: row.status,
            created_at: row.created_at,
            updated_at: row.updated_at
        }));
    }

    // 同意好友请求（更新状态 + 创建双向好友关系）
    static async acceptRequest(requestId, receiverId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // 验证请求存在且属于当前用户
            const [requestRows] = await connection.execute(
                'SELECT id, sender_id, receiver_id, status FROM friend_requests WHERE id = ? AND receiver_id = ?',
                [requestId, receiverId]
            );
            if (!requestRows[0]) {
                throw new Error('请求不存在或无权操作');
            }
            if (requestRows[0].status !== 'pending') {
                throw new Error('该请求已被处理');
            }

            const senderId = requestRows[0].sender_id;

            // 更新请求状态
            await connection.execute(
                'UPDATE friend_requests SET status = ?, updated_at = ? WHERE id = ?',
                ['accepted', new Date(), requestId]
            );

            // 创建双向好友关系
            await connection.execute(
                'INSERT INTO friends (user_id, friend_id, created_at) VALUES (?, ?, ?), (?, ?, ?)',
                [senderId, receiverId, new Date(), receiverId, senderId, new Date()]
            );

            await connection.commit();
            return { senderId };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // 拒绝好友请求
    static async rejectRequest(requestId, receiverId) {
        const sql = 'UPDATE friend_requests SET status = ?, updated_at = ? WHERE id = ? AND receiver_id = ? AND status = ?';
        const [result] = await pool.execute(sql, ['rejected', new Date(), requestId, receiverId, 'pending']);
        if (result.affectedRows === 0) {
            throw new Error('请求不存在或已被处理');
        }
        return true;
    }

    // 清除通知（直接删除记录）
    static async dismissNotification(requestId, userId) {
        const sql = 'DELETE FROM friend_requests WHERE id = ? AND (sender_id = ? OR receiver_id = ?)';
        const [result] = await pool.execute(sql, [requestId, userId, userId]);
        return result.affectedRows > 0;
    }

    // 删除好友（双向删除）
    static async deleteFriend(userId, friendId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // 删除双向好友关系
            await connection.execute(
                'DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
                [userId, friendId, friendId, userId]
            );

            // 删除相关的已处理请求记录（可选：保留历史记录则跳过此步）
            await connection.execute(
                'DELETE FROM friend_requests WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)',
                [userId, friendId, friendId, userId]
            );

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // 获取好友列表
    static async getFriends(userId) {
        const sql = `
            SELECT ud.user_id, ud.username, ud.avatar_path, f.created_at as friend_since
            FROM friends f
            JOIN user_data ud ON f.friend_id = ud.user_id
            WHERE f.user_id = ?
            ORDER BY f.created_at DESC
        `;
        const [rows] = await pool.execute(sql, [userId]);
        return rows.map(row => formatUserData(row));
    }

    // 检查是否已是好友
    static async areFriends(userId1, userId2) {
        const sql = 'SELECT id FROM friends WHERE user_id = ? AND friend_id = ?';
        const [rows] = await pool.execute(sql, [userId1, userId2]);
        return rows.length > 0;
    }

    // 获取与某用户的综合好友状态
    static async getFriendStatus(userId, targetUserId) {
        // 检查是否已是好友
        const isFriend = await Friend.areFriends(userId, targetUserId);
        if (isFriend) {
            return { status: 'friend' };
        }

        // 检查是否有待处理的发送请求
        const pendingRequest = await Friend.getPendingRequest(userId, targetUserId);
        if (pendingRequest) {
            return { status: 'pending', requestId: pendingRequest.id };
        }

        // 检查是否有待处理的接收请求
        const reversePending = await Friend.getReversePendingRequest(userId, targetUserId);
        if (reversePending) {
            return { status: 'received', requestId: reversePending.id };
        }

        // 检查被拒绝的请求（冷却期）
        const rejectedRequest = await Friend.getRejectedRequest(userId, targetUserId);
        if (rejectedRequest) {
            const cooldownEnd = new Date(rejectedRequest.updated_at.getTime() + 12 * 60 * 60 * 1000);
            if (new Date() < cooldownEnd) {
                return { status: 'cooldown', requestId: rejectedRequest.id, cooldownEnd };
            }
        }

        return { status: 'none' };
    }
}

module.exports = Friend;
