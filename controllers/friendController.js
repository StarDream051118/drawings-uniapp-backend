const FriendService = require('../services/friendService');
const User = require('../models/user');
const { broadcastToRoom } = require('../socket/broadcast');

class FriendController {
    // POST /api/friend/request - 发送好友请求
    static async sendRequest(req, res) {
        try {
            const { receiver_id } = req.body;
            const senderId = req.user_id;

            if (!receiver_id) {
                return res.status(400).json({
                    code: 400,
                    msg: '接收者ID不能为空'
                });
            }

            const result = await FriendService.sendRequest(senderId, receiver_id);

            // 发送 Socket 通知（同时发送到 Socket.io 和 WebSocket）
            if (result.action === 'created') {
                broadcastToRoom(`user_${receiver_id}`, 'friend_notification', {
                    type: 'new_request',
                    data: { requestId: result.requestId }
                });
            }

            const msgMap = {
                'created': '好友请求已发送',
                'auto_accepted': '对方已发送请求给你，已自动成为好友'
            };

            res.status(200).json({
                code: 200,
                msg: msgMap[result.action] || '操作成功',
                data: result
            });
        } catch (error) {
            const code = (typeof error.code === 'number') ? error.code : 500;
            const msg = error.msg || '服务器内部错误';
            console.error('发送好友请求错误：', error);
            res.status(code).json({ code, msg });
        }
    }

    // POST /api/friend/accept - 同意好友请求
    static async acceptRequest(req, res) {
        try {
            const { request_id } = req.body;
            const receiverId = req.user_id;

            if (!request_id) {
                return res.status(400).json({
                    code: 400,
                    msg: '请求ID不能为空'
                });
            }

            const result = await FriendService.acceptRequest(request_id, receiverId);

            // 发送 Socket 通知给发送者（同时发送到 Socket.io 和 WebSocket）
            broadcastToRoom(`user_${result.senderId}`, 'friend_notification', {
                type: 'request_accepted',
                data: { requestId: request_id }
            });
            console.log('[Socket] 已发送同意通知到:', `user_${result.senderId}`);

            res.status(200).json({
                code: 200,
                msg: '已同意好友请求'
            });
        } catch (error) {
            const code = (typeof error.code === 'number') ? error.code : 500;
            const msg = error.msg || '服务器内部错误';
            console.error('同意好友请求错误：', error);
            res.status(code).json({ code, msg });
        }
    }

    // POST /api/friend/reject - 拒绝好友请求
    static async rejectRequest(req, res) {
        try {
            const { request_id } = req.body;
            const receiverId = req.user_id;

            if (!request_id) {
                return res.status(400).json({
                    code: 400,
                    msg: '请求ID不能为空'
                });
            }

            // 获取请求详情，用于通知发送者
            const Friend = require('../models/friend');
            const request = await Friend.getRequestById(request_id);

            await FriendService.rejectRequest(request_id, receiverId);

            // 发送 Socket 通知给发送者（同时发送到 Socket.io 和 WebSocket）
            if (request) {
                broadcastToRoom(`user_${request.sender_id}`, 'friend_notification', {
                    type: 'request_rejected',
                    data: { requestId: request_id }
                });
            }

            res.status(200).json({
                code: 200,
                msg: '已拒绝好友请求'
            });
        } catch (error) {
            const code = (typeof error.code === 'number') ? error.code : 500;
            const msg = error.msg || '服务器内部错误';
            console.error('拒绝好友请求错误：', error);
            res.status(code).json({ code, msg });
        }
    }

    // DELETE /api/friend/dismiss/:requestId - 清除通知
    static async dismissNotification(req, res) {
        try {
            const { requestId } = req.params;
            const userId = req.user_id;

            await FriendService.dismissNotification(requestId, userId);

            res.status(200).json({
                code: 200,
                msg: '通知已清除'
            });
        } catch (error) {
            const code = (typeof error.code === 'number') ? error.code : 500;
            const msg = error.msg || '服务器内部错误';
            console.error('清除通知错误：', error);
            res.status(code).json({ code, msg });
        }
    }

    // DELETE /api/friend/delete/:friendId - 删除好友
    static async deleteFriend(req, res) {
        try {
            const { friendId } = req.params;
            const userId = req.user_id;

            if (!friendId) {
                return res.status(400).json({
                    code: 400,
                    msg: '好友ID不能为空'
                });
            }

            await FriendService.deleteFriend(userId, friendId);

            // 获取删除方的用户名
            const userData = await User.findByUserId(userId);
            const username = userData ? userData.username : '未知用户';

            // 发送 Socket 通知给被删除的好友（同时发送到 Socket.io 和 WebSocket）
            broadcastToRoom(`user_${friendId}`, 'friend_notification', {
                type: 'friend_removed',
                data: { removedBy: userId, username: username }
            });
            console.log('[Socket] 已发送删除好友通知到:', `user_${friendId}`);

            // 通知前端刷新好友列表
            broadcastToRoom(`user_${userId}`, 'friend_notification', {
                type: 'friend_list_refresh',
                data: {}
            });

            res.status(200).json({
                code: 200,
                msg: '已删除好友'
            });
        } catch (error) {
            const code = (typeof error.code === 'number') ? error.code : 500;
            const msg = error.msg || '服务器内部错误';
            console.error('删除好友错误：', error);
            res.status(code).json({ code, msg });
        }
    }

    // GET /api/friend/notifications - 获取通知列表
    static async getNotifications(req, res) {
        try {
            const userId = req.user_id;
            const notifications = await FriendService.getNotifications(userId);

            res.status(200).json({
                code: 200,
                msg: '获取成功',
                data: notifications
            });
        } catch (error) {
            console.error('获取通知列表错误：', error);
            res.status(500).json({
                code: 500,
                msg: '服务器内部错误'
            });
        }
    }

    // GET /api/friend/list - 获取好友列表
    static async getFriends(req, res) {
        try {
            const userId = req.user_id;
            const friends = await FriendService.getFriends(userId);

            res.status(200).json({
                code: 200,
                msg: '获取成功',
                data: friends
            });
        } catch (error) {
            console.error('获取好友列表错误：', error);
            res.status(500).json({
                code: 500,
                msg: '服务器内部错误'
            });
        }
    }

    // GET /api/friend/status/:targetUserId - 查询与某用户的好友状态
    static async getFriendStatus(req, res) {
        try {
            const userId = req.user_id;
            const { targetUserId } = req.params;

            if (!targetUserId) {
                return res.status(400).json({
                    code: 400,
                    msg: '目标用户ID不能为空'
                });
            }

            const status = await FriendService.getFriendStatus(userId, targetUserId);

            res.status(200).json({
                code: 200,
                msg: '获取成功',
                data: status
            });
        } catch (error) {
            console.error('获取好友状态错误：', error);
            res.status(500).json({
                code: 500,
                msg: '服务器内部错误'
            });
        }
    }
}

module.exports = FriendController;
