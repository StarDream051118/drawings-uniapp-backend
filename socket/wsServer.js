// 原生 WebSocket 服务器 - 供 APP 端使用

const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const ChatService = require('../services/chatService');
const { broadcastToRoom: unifiedBroadcast } = require('./broadcast');

// 房间管理
// ws -> Set<roomName>
const clientRooms = new Map();
// roomName -> Set<ws>
const roomClients = new Map();

function joinRoom(ws, room) {
    // 添加到客户端的房间集合
    if (!clientRooms.has(ws)) {
        clientRooms.set(ws, new Set());
    }
    clientRooms.get(ws).add(room);

    // 添加到房间的客户端集合
    if (!roomClients.has(room)) {
        roomClients.set(room, new Set());
    }
    roomClients.get(room).add(ws);
}

function leaveRoom(ws, room) {
    // 从客户端的房间集合移除
    if (clientRooms.has(ws)) {
        clientRooms.get(ws).delete(room);
    }

    // 从房间的客户端集合移除
    if (roomClients.has(room)) {
        roomClients.get(room).delete(ws);
        if (roomClients.get(room).size === 0) {
            roomClients.delete(room);
        }
    }
}

function leaveAllRooms(ws) {
    if (clientRooms.has(ws)) {
        for (const room of clientRooms.get(ws)) {
            if (roomClients.has(room)) {
                roomClients.get(room).delete(ws);
                if (roomClients.get(room).size === 0) {
                    roomClients.delete(room);
                }
            }
        }
        clientRooms.delete(ws);
    }
}

function broadcastToRoom(roomName, event, data) {
    if (!roomClients.has(roomName)) return;

    const message = JSON.stringify({ type: 'event', event, data });
    for (const ws of roomClients.get(roomName)) {
        if (ws.readyState === 1) { // WebSocket.OPEN
            ws.send(message);
        }
    }
}

function sendToClient(ws, type, data) {
    if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type, ...data }));
    }
}

function initWSServer(server) {
    const wss = new WebSocketServer({ server, path: '/ws' });

    wss.on('connection', (ws, req) => {
        console.log('[WS] 新连接');

        let authenticated = false;
        let userId = null;

        // 10 秒认证超时
        const authTimer = setTimeout(() => {
            if (!authenticated) {
                console.log('[WS] 认证超时，断开连接');
                ws.close(4001, 'Auth timeout');
            }
        }, 10000);

        ws.on('message', async (raw) => {
            let msg;
            try {
                msg = JSON.parse(raw.toString());
            } catch (e) {
                sendToClient(ws, 'error', { msg: 'Invalid JSON' });
                return;
            }

            // 认证消息
            if (msg.type === 'auth') {
                if (authenticated) {
                    sendToClient(ws, 'error', { msg: 'Already authenticated' });
                    return;
                }

                try {
                    const decoded = jwt.verify(msg.token, process.env.JWT_SECRET);
                    userId = decoded.user_id || decoded.id;
                    authenticated = true;
                    clearTimeout(authTimer);

                    // 加入用户私有房间
                    joinRoom(ws, `user_${userId}`);

                    sendToClient(ws, 'auth_success', {});
                    console.log(`[WS] 用户 ${userId} 认证成功`);
                } catch (err) {
                    sendToClient(ws, 'error', { msg: '认证失败' });
                    console.log('[WS] 认证失败:', err.message);
                    ws.close(4002, 'Auth failed');
                }
                return;
            }

            // 未认证则拒绝
            if (!authenticated) {
                sendToClient(ws, 'error', { msg: 'Not authenticated' });
                return;
            }

            // 事件消息
            if (msg.type === 'event') {
                await handleEvent(ws, userId, msg.event, msg.data);
            }
        });

        ws.on('close', () => {
            clearTimeout(authTimer);
            leaveAllRooms(ws);
            console.log(`[WS] 用户 ${userId || 'unknown'} 断开连接`);
        });

        ws.on('error', (err) => {
            console.error('[WS] 错误:', err.message);
        });
    });

    // 暴露 broadcastToRoom 供外部使用
    wss.broadcastToRoom = broadcastToRoom;

    console.log('[WS] WebSocket 服务器已启动 (路径: /ws)');
    return wss;
}

async function handleEvent(ws, userId, event, data) {
    try {
        switch (event) {
            case 'join_session':
                joinRoom(ws, `session_${data}`);
                console.log(`[WS] 用户 ${userId} 加入会话房间: session_${data}`);
                break;

            case 'leave_session':
                leaveRoom(ws, `session_${data}`);
                console.log(`[WS] 用户 ${userId} 离开会话房间: session_${data}`);
                break;

            case 'chat_message':
                await handleChatMessage(ws, userId, data);
                break;

            default:
                sendToClient(ws, 'error', { msg: `Unknown event: ${event}` });
        }
    } catch (error) {
        console.error(`[WS] 处理事件 ${event} 错误:`, error);
        sendToClient(ws, 'error', { msg: error.msg || 'Server error' });
    }
}

async function handleChatMessage(ws, userId, data) {
    const { session_id, content, msg_type = 'text', media_id = null } = data;

    if (!session_id || !content) {
        sendToClient(ws, 'error', { msg: '参数不完整' });
        return;
    }

    // 复用 ChatService 逻辑
    const result = await ChatService.sendMessage(session_id, userId, content, msg_type, media_id);

    // 广播到会话房间（使用统一广播，同时发送到 Socket.io 和 WebSocket）
    unifiedBroadcast(`session_${session_id}`, 'chat_message', {
        id: result.id,
        session_id: result.session_id,
        sender_id: result.sender_id,
        sender_name: result.sender_name,
        content: result.content,
        msg_type: result.msg_type,
        media_id: result.media_id,
        created_at: result.created_at
    });

    // 通知接收方会话列表更新
    unifiedBroadcast(`user_${result.receiver_id}`, 'session_update', {
        session_id: session_id,
        last_msg: result.content,
        last_time: result.created_at
    });

    console.log(`[WS] 用户 ${userId} 发送消息到会话 ${session_id}`);
}

module.exports = initWSServer;
