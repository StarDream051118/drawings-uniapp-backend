const jwt = require('jsonwebtoken');
const ChatService = require('../services/chatService');
const { broadcastToRoom } = require('./broadcast');

function initSocket(io) {
    // Middleware for authentication
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.headers.token;
        if (!token) {
            return next(new Error('Authentication error'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            // Handle user_id mapping if needed
            if (socket.user.id && !socket.user.user_id) {
                socket.user.user_id = socket.user.id;
            }
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`[Socket] 用户连接: ${socket.user.user_id}`);

        // Join user's private room
        const userId = socket.user.user_id;
        socket.join(`user_${userId}`);
        console.log(`[Socket] 用户 ${userId} 加入房间: user_${userId}`);

        // 加入聊天会话房间
        socket.on('join_session', (sessionId) => {
            const roomName = `session_${sessionId}`;
            socket.join(roomName);
            const room = io.sockets.adapter.rooms.get(roomName);
            const clientCount = room ? room.size : 0;
            console.log(`[Socket] 用户 ${userId} 加入会话房间: ${roomName}, 当前房间人数: ${clientCount}`);
        });

        // 离开聊天会话房间
        socket.on('leave_session', (sessionId) => {
            socket.leave(`session_${sessionId}`);
            console.log(`[Socket] 用户 ${userId} 离开会话房间: session_${sessionId}`);
        });

        // 发送聊天消息
        socket.on('chat_message', async (data) => {
            try {
                const { session_id, content, msg_type = 'text', media_id = null } = data;

                if (!session_id || !content) {
                    socket.emit('error', { msg: '参数不完整' });
                    return;
                }

                // 通过 Service 发送消息
                const result = await ChatService.sendMessage(session_id, userId, content, msg_type, media_id);

                // 广播到会话房间（包括发送者）- 同时发送到 Socket.io 和 WebSocket
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

                // 发送会话更新通知给接收方 - 同时发送到 Socket.io 和 WebSocket
                broadcastToRoom(`user_${result.receiver_id}`, 'session_update', {
                    session_id: session_id,
                    last_msg: result.content,
                    last_time: result.created_at
                });

                console.log(`[Socket] 用户 ${userId} 发送消息到会话 ${session_id}`);
            } catch (error) {
                console.error('[Socket] 发送消息错误:', error);
                socket.emit('error', { msg: error.msg || '发送失败' });
            }
        });

        socket.on('disconnect', () => {
            console.log(`[Socket] 用户断开连接: ${userId}`);
        });
    });
}

module.exports = initSocket;