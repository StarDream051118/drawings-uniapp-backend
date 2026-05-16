const pool = require('../db/index');
const redis = require('../db/redis');
const config = require('../config/index');

function formatAvatar(avatarPath) {
    if (!avatarPath) return null;
    return avatarPath.startsWith('http') ? avatarPath : `${config.BASE_URL}${avatarPath}`;
}

class Chat {
    // 获取或创建会话
    static async getOrCreateSession(userId1, userId2) {
        // 确保 userId1 < userId2 以保持一致性
        const [uid1, uid2] = [userId1, userId2].sort();

        // 查找现有会话
        const findSql = 'SELECT * FROM chat_session WHERE user_id1 = ? AND user_id2 = ?';
        const [rows] = await pool.execute(findSql, [uid1, uid2]);

        if (rows[0]) {
            const session = rows[0];
            // 如果被删除方要恢复会话
            if (session.user_id1 === uid1 && session.is_deleted1 === 1) {
                await pool.execute('UPDATE chat_session SET is_deleted1 = 0 WHERE id = ?', [session.id]);
            } else if (session.user_id2 === uid2 && session.is_deleted2 === 1) {
                await pool.execute('UPDATE chat_session SET is_deleted2 = 0 WHERE id = ?', [session.id]);
            }
            return session;
        }

        // 创建新会话
        const createSql = 'INSERT INTO chat_session (user_id1, user_id2) VALUES (?, ?)';
        const [result] = await pool.execute(createSql, [uid1, uid2]);

        return {
            id: result.insertId,
            user_id1: uid1,
            user_id2: uid2,
            last_msg_content: '',
            last_msg_time: null,
            unread_count1: 0,
            unread_count2: 0,
            is_deleted1: 0,
            is_deleted2: 0
        };
    }

    // 获取用户的所有会话列表（分页）
    static async getSessions(userId, page = 1, limit = 10) {
        const offset = (page - 1) * limit;

        const sql = `
            SELECT cs.*,
                   CASE WHEN cs.user_id1 = ? THEN cs.user_id2 ELSE cs.user_id1 END as target_user_id
            FROM chat_session cs
            WHERE (cs.user_id1 = ? OR cs.user_id2 = ?)
              AND ((cs.user_id1 = ? AND cs.is_deleted1 = 0) OR (cs.user_id2 = ? AND cs.is_deleted2 = 0))
            ORDER BY cs.last_msg_time DESC, cs.updated_at DESC
            LIMIT ? OFFSET ?
        `;
        const [rows] = await pool.execute(sql, [userId, userId, userId, userId, userId, limit, offset]);

        // 填充对方用户信息和未读数
        const sessions = [];
        for (const row of rows) {
            // 获取对方用户信息
            const userSql = 'SELECT user_id, username, avatar_path FROM user_data WHERE user_id = ?';
            const [userRows] = await pool.execute(userSql, [row.target_user_id]);
            const targetUser = userRows[0] || {};

            // 从 Redis 获取未读数，未命中则从数据库读取
            let unreadCount = 0;
            const redisKey = `chat:session:${row.id}:unread:${userId}`;
            const cachedUnread = await redis.get(redisKey);

            if (cachedUnread !== null) {
                unreadCount = parseInt(cachedUnread);
            } else {
                // 从数据库读取
                if (row.user_id1 === userId) {
                    unreadCount = row.unread_count1 || 0;
                } else {
                    unreadCount = row.unread_count2 || 0;
                }
                // 写入缓存
                await redis.set(redisKey, unreadCount, 'EX', 300);
            }

            sessions.push({
                id: row.id,
                user_id: targetUser.user_id,
                username: targetUser.username || '未知用户',
                avatar_path: formatAvatar(targetUser.avatar_path),
                last_msg: row.last_msg_content || '',
                last_time: row.last_msg_time,
                unread_count: unreadCount
            });
        }

        return sessions;
    }

    // 获取会话详情
    static async getSessionById(sessionId) {
        const sql = 'SELECT * FROM chat_session WHERE id = ?';
        const [rows] = await pool.execute(sql, [sessionId]);
        return rows[0] || null;
    }

    // 获取历史消息（分页）
    static async getMessages(sessionId, beforeId = null, limit = 20) {
        let sql = `
            SELECT cm.id, cm.session_id, cm.sender_id, cm.content, cm.msg_type, cm.media_id, cm.created_at, ud.username as sender_name
            FROM chat_message cm
            LEFT JOIN user_data ud ON cm.sender_id = ud.user_id
            WHERE cm.session_id = ?
        `;
        const params = [sessionId];

        if (beforeId) {
            sql += ' AND cm.id < ?';
            params.push(beforeId);
        }

        sql += ' ORDER BY cm.id DESC LIMIT ?';
        params.push(limit);

        const [rows] = await pool.execute(sql, params);

        return rows.reverse().map(row => ({
            id: row.id,
            session_id: row.session_id,
            sender_id: row.sender_id,
            sender_name: row.sender_name,
            content: row.content,
            msg_type: row.msg_type,
            media_id: row.media_id,
            created_at: row.created_at
        }));
    }

    // 发送消息
    static async createMessage(sessionId, senderId, content, msgType = 'text', mediaId = null) {
        const sql = 'INSERT INTO chat_message (session_id, sender_id, content, msg_type, media_id) VALUES (?, ?, ?, ?, ?)';
        const [result] = await pool.execute(sql, [sessionId, senderId, content, msgType, mediaId]);

        return {
            id: result.insertId,
            session_id: sessionId,
            sender_id: senderId,
            content: content,
            msg_type: msgType,
            media_id: mediaId,
            created_at: new Date()
        };
    }

    // 更新会话最后消息信息
    static async updateSessionLastMsg(sessionId, content, senderId) {
        // 获取会话信息以确定接收方
        const session = await Chat.getSessionById(sessionId);
        if (!session) return;

        const sql = 'UPDATE chat_session SET last_msg_content = ?, last_msg_time = NOW(), updated_at = NOW() WHERE id = ?';
        await pool.execute(sql, [content.substring(0, 100), sessionId]);
    }

    // 增加未读计数
    static async incrementUnread(sessionId, receiverId) {
        const session = await Chat.getSessionById(sessionId);
        if (!session) return;

        // 更新数据库
        const field = session.user_id1 === receiverId ? 'unread_count1' : 'unread_count2';
        const sql = `UPDATE chat_session SET ${field} = ${field} + 1 WHERE id = ?`;
        await pool.execute(sql, [sessionId]);

        // 更新 Redis 缓存
        const redisKey = `chat:session:${sessionId}:unread:${receiverId}`;
        await redis.incr(redisKey);
        await redis.expire(redisKey, 86400); // 24小时过期
    }

    // 清零未读计数
    static async clearUnread(sessionId, userId) {
        const session = await Chat.getSessionById(sessionId);
        if (!session) return;

        // 更新数据库
        const field = session.user_id1 === userId ? 'unread_count1' : 'unread_count2';
        const sql = `UPDATE chat_session SET ${field} = 0 WHERE id = ?`;
        await pool.execute(sql, [sessionId]);

        // 删除 Redis 缓存
        const redisKey = `chat:session:${sessionId}:unread:${userId}`;
        await redis.del(redisKey);
    }

    // 删除会话（仅对当前用户）
    static async deleteSession(sessionId, userId) {
        const session = await Chat.getSessionById(sessionId);
        if (!session) return false;

        const field = session.user_id1 === userId ? 'is_deleted1' : 'is_deleted2';
        const sql = `UPDATE chat_session SET ${field} = 1 WHERE id = ?`;
        await pool.execute(sql, [sessionId]);

        return true;
    }

    // 恢复被删除的会话
    static async restoreSession(sessionId, userPosition) {
        const field = userPosition === 1 ? 'is_deleted1' : 'is_deleted2';
        const sql = `UPDATE chat_session SET ${field} = 0 WHERE id = ?`;
        await pool.execute(sql, [sessionId]);
    }

    // 检查非好友发送限制
    static async checkSendLimit(sessionId, senderId, isFriend) {
        // 好友无限制
        if (isFriend) return { allowed: true };

        // 检查最近消息序列
        const sql = `
            SELECT sender_id FROM chat_message
            WHERE session_id = ?
            ORDER BY id DESC
            LIMIT 3
        `;
        const [rows] = await pool.execute(sql, [sessionId]);

        // 如果最近3条消息全是自己发的，则限制发送
        if (rows.length >= 3 && rows.every(row => row.sender_id === senderId)) {
            return {
                allowed: false,
                msg: '等待对方回复后再发送消息'
            };
        }

        return { allowed: true };
    }

    // 检查是否是会话成员
    static async isSessionMember(sessionId, userId) {
        const sql = 'SELECT id FROM chat_session WHERE id = ? AND (user_id1 = ? OR user_id2 = ?)';
        const [rows] = await pool.execute(sql, [sessionId, userId, userId]);
        return rows.length > 0;
    }

    // 保存媒体文件信息
    static async createMedia(sessionId, senderId, mediaType, filePath, fileSize, thumbnailPath = null) {
        const sql = 'INSERT INTO chat_message_media (session_id, sender_id, media_type, file_path, file_size, thumbnail_path) VALUES (?, ?, ?, ?, ?, ?)';
        const [result] = await pool.execute(sql, [sessionId, senderId, mediaType, filePath, fileSize, thumbnailPath]);
        return result.insertId;
    }

    // 获取媒体文件信息
    static async getMedia(mediaId) {
        const sql = 'SELECT * FROM chat_message_media WHERE id = ?';
        const [rows] = await pool.execute(sql, [mediaId]);
        return rows[0] || null;
    }
}

module.exports = Chat;
