const ChatService = require('../services/chatService');
const Chat = require('../models/chat');
const { broadcastToRoom } = require('../socket/broadcast');

class ChatController {
    // GET /api/chat/session/:targetUserId - 获取或创建会话
    static async getOrCreateSession(req, res) {
        try {
            const { targetUserId } = req.params;
            const userId = req.user_id;

            const result = await ChatService.getOrCreateSession(userId, targetUserId);

            res.status(200).json({
                code: 200,
                msg: '获取成功',
                data: result
            });
        } catch (error) {
            const code = (typeof error.code === 'number') ? error.code : 500;
            const msg = error.msg || '服务器内部错误';
            console.error('获取会话错误：', error);
            res.status(code).json({ code, msg });
        }
    }

    // GET /api/chat/sessions - 获取会话列表
    static async getSessions(req, res) {
        try {
            const userId = req.user_id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;

            const sessions = await ChatService.getSessions(userId, page, limit);

            res.status(200).json({
                code: 200,
                msg: '获取成功',
                data: sessions
            });
        } catch (error) {
            console.error('获取会话列表错误：', error);
            res.status(500).json({ code: 500, msg: '服务器内部错误' });
        }
    }

    // GET /api/chat/messages/:sessionId - 获取历史消息
    static async getMessages(req, res) {
        try {
            const { sessionId } = req.params;
            const userId = req.user_id;
            const beforeId = req.query.beforeId ? parseInt(req.query.beforeId) : null;
            const limit = parseInt(req.query.limit) || 20;

            const messages = await ChatService.getMessages(sessionId, userId, beforeId, limit);

            res.status(200).json({
                code: 200,
                msg: '获取成功',
                data: messages
            });
        } catch (error) {
            const code = (typeof error.code === 'number') ? error.code : 500;
            const msg = error.msg || '服务器内部错误';
            console.error('获取消息错误：', error);
            res.status(code).json({ code, msg });
        }
    }

    // POST /api/chat/messages - 发送消息（HTTP 备用）
    static async sendMessage(req, res) {
        try {
            const { session_id, content, msg_type = 'text', media_id = null } = req.body;
            const senderId = req.user_id;

            if (!session_id || !content) {
                return res.status(400).json({ code: 400, msg: '参数不完整' });
            }

            const result = await ChatService.sendMessage(session_id, senderId, content, msg_type, media_id);

            // 通过 Socket 发送实时消息（同时发送到 Socket.io 和 WebSocket）
            broadcastToRoom(`session_${session_id}`, 'chat_message', {
                id: result.id,
                session_id: result.session_id,
                sender_id: result.sender_id,
                sender_name: result.sender_name,
                content: result.content,
                msg_type: result.msg_type,
                media_id: result.media_id,
                created_at: result.created_at
            });

            // 发送会话更新通知给接收方
            broadcastToRoom(`user_${result.receiver_id}`, 'session_update', {
                session_id: session_id,
                last_msg: result.content,
                last_time: result.created_at
            });

            res.status(200).json({
                code: 200,
                msg: '发送成功',
                data: result
            });
        } catch (error) {
            const code = (typeof error.code === 'number') ? error.code : 500;
            const msg = error.msg || '服务器内部错误';
            console.error('发送消息错误：', error);
            res.status(code).json({ code, msg });
        }
    }

    // PUT /api/chat/read/:sessionId - 标记已读
    static async markAsRead(req, res) {
        try {
            const { sessionId } = req.params;
            const userId = req.user_id;

            await ChatService.markAsRead(sessionId, userId);

            res.status(200).json({
                code: 200,
                msg: '已标记已读'
            });
        } catch (error) {
            console.error('标记已读错误：', error);
            res.status(500).json({ code: 500, msg: '服务器内部错误' });
        }
    }

    // DELETE /api/chat/session/:sessionId - 删除会话
    static async deleteSession(req, res) {
        try {
            const { sessionId } = req.params;
            const userId = req.user_id;

            await ChatService.deleteSession(sessionId, userId);

            res.status(200).json({
                code: 200,
                msg: '已删除会话'
            });
        } catch (error) {
            const code = (typeof error.code === 'number') ? error.code : 500;
            const msg = error.msg || '服务器内部错误';
            console.error('删除会话错误：', error);
            res.status(code).json({ code, msg });
        }
    }

    // POST /api/chat/upload - 上传图片
    static async uploadImage(req, res) {
        try {
            const { session_id } = req.body;
            const senderId = req.user_id;
            const file = req.file;

            if (!file) {
                return res.status(400).json({ code: 400, msg: '请选择图片' });
            }

            // 检查文件大小（10MB）
            if (file.size > 10 * 1024 * 1024) {
                return res.status(400).json({ code: 400, msg: '图片大小不能超过10MB' });
            }

            // 保存媒体文件信息
            const filePath = `/uploads/chat/${file.filename}`;
            const mediaId = await Chat.createMedia(
                session_id,
                senderId,
                'image',
                filePath,
                file.size
            );

            res.status(200).json({
                code: 200,
                msg: '上传成功',
                data: { media_id: mediaId, file_path: filePath }
            });
        } catch (error) {
            console.error('上传图片错误：', error);
            res.status(500).json({ code: 500, msg: '服务器内部错误' });
        }
    }
}

module.exports = ChatController;
