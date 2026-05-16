const Chat = require('../models/chat');
const Friend = require('../models/friend');
const User = require('../models/user');

class ChatService {
    // 获取或创建会话
    static async getOrCreateSession(userId, targetUserId) {
        // 检查目标用户是否存在
        const targetUser = await User.findByUserId(targetUserId);
        if (!targetUser) {
            throw { code: 404, msg: '用户不存在' };
        }

        // 不能和自己创建会话
        if (userId === targetUserId) {
            throw { code: 400, msg: '不能和自己聊天' };
        }

        const session = await Chat.getOrCreateSession(userId, targetUserId);
        return {
            sessionId: session.id,
            targetUserId: targetUserId,
            targetUsername: targetUser.username,
            targetAvatar: targetUser.avatar_path
        };
    }

    // 获取会话列表
    static async getSessions(userId, page = 1, limit = 10) {
        return await Chat.getSessions(userId, page, limit);
    }

    // 获取历史消息
    static async getMessages(sessionId, userId, beforeId = null, limit = 20) {
        // 验证会话成员
        const isMember = await Chat.isSessionMember(sessionId, userId);
        if (!isMember) {
            throw { code: 403, msg: '无权访问该会话' };
        }

        return await Chat.getMessages(sessionId, beforeId, limit);
    }

    // 发送消息
    static async sendMessage(sessionId, senderId, content, msgType = 'text', mediaId = null) {
        // 验证会话成员
        const isMember = await Chat.isSessionMember(sessionId, senderId);
        if (!isMember) {
            throw { code: 403, msg: '无权发送消息' };
        }

        // 获取会话信息
        const session = await Chat.getSessionById(sessionId);
        if (!session) {
            throw { code: 404, msg: '会话不存在' };
        }

        // 确定接收方
        const receiverId = session.user_id1 === senderId ? session.user_id2 : session.user_id1;

        // 检查是否是好友
        const isFriend = await Friend.areFriends(senderId, receiverId);

        // 检查非好友发送限制
        const limitCheck = await Chat.checkSendLimit(sessionId, senderId, isFriend);
        if (!limitCheck.allowed) {
            throw { code: 400, msg: limitCheck.msg };
        }

        // 恢复被删除的会话
        if (session.user_id1 === senderId && session.is_deleted1 === 1) {
            await Chat.restoreSession(sessionId, 1);
        } else if (session.user_id2 === senderId && session.is_deleted2 === 1) {
            await Chat.restoreSession(sessionId, 2);
        }

        // 创建消息
        const message = await Chat.createMessage(sessionId, senderId, content, msgType, mediaId);

        // 更新会话最后消息
        const previewContent = msgType === 'image' ? '[图片]' : content;
        await Chat.updateSessionLastMsg(sessionId, previewContent, senderId);

        // 增加接收方未读计数
        await Chat.incrementUnread(sessionId, receiverId);

        // 获取发送者信息
        const sender = await User.findByUserId(senderId);

        return {
            ...message,
            sender_name: sender ? sender.username : '未知用户',
            receiver_id: receiverId
        };
    }

    // 标记已读
    static async markAsRead(sessionId, userId) {
        await Chat.clearUnread(sessionId, userId);
    }

    // 删除会话
    static async deleteSession(sessionId, userId) {
        const isMember = await Chat.isSessionMember(sessionId, userId);
        if (!isMember) {
            throw { code: 403, msg: '无权删除该会话' };
        }

        await Chat.deleteSession(sessionId, userId);
    }
}

module.exports = ChatService;
