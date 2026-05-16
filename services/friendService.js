const Friend = require('../models/friend');
const User = require('../models/user');

class FriendService {
    // 发送好友请求
    static async sendRequest(senderId, receiverId) {
        // 1. 检查不能添加自己
        if (senderId === receiverId) {
            throw { code: 400, msg: '不能添加自己为好友' };
        }

        // 2. 检查目标用户是否存在
        const targetUser = await User.findByUserId(receiverId);
        if (!targetUser) {
            throw { code: 404, msg: '用户不存在' };
        }

        // 3. 检查是否已是好友
        const isFriend = await Friend.areFriends(senderId, receiverId);
        if (isFriend) {
            throw { code: 400, msg: '你们已经是好友了' };
        }

        // 4. 检查是否有待处理请求（我发给对方的）
        const pendingRequest = await Friend.getPendingRequest(senderId, receiverId);
        if (pendingRequest) {
            throw { code: 400, msg: '已发送好友请求，请等待对方处理' };
        }

        // 5. 检查对方是否已给我发请求（直接成为好友）
        const reversePending = await Friend.getReversePendingRequest(senderId, receiverId);
        if (reversePending) {
            // 对方已发请求给我，直接同意
            const result = await Friend.acceptRequest(reversePending.id, senderId);
            return { action: 'auto_accepted', requestId: reversePending.id, senderId: result.senderId };
        }

        // 6. 检查被拒绝且在12小时冷却期内
        const rejectedRequest = await Friend.getRejectedRequest(senderId, receiverId);
        if (rejectedRequest) {
            const cooldownEnd = new Date(rejectedRequest.updated_at.getTime() + 12 * 60 * 60 * 1000);
            if (new Date() < cooldownEnd) {
                const remainingHours = Math.ceil((cooldownEnd - new Date()) / (60 * 60 * 1000));
                throw { code: 400, msg: `对方已拒绝你的请求，请等待${remainingHours}小时后再试` };
            }
        }

        // 7. 创建请求
        const requestId = await Friend.createRequest(senderId, receiverId);
        return { action: 'created', requestId, receiverId };
    }

    // 同意好友请求
    static async acceptRequest(requestId, receiverId) {
        const result = await Friend.acceptRequest(requestId, receiverId);
        return result;
    }

    // 拒绝好友请求
    static async rejectRequest(requestId, receiverId) {
        await Friend.rejectRequest(requestId, receiverId);
        return true;
    }

    // 清除通知
    static async dismissNotification(requestId, userId) {
        const success = await Friend.dismissNotification(requestId, userId);
        if (!success) {
            throw { code: 404, msg: '通知不存在' };
        }
        return true;
    }

    // 获取通知列表
    static async getNotifications(userId) {
        const [receivedRequests, sentRequests] = await Promise.all([
            Friend.getReceivedRequests(userId),
            Friend.getSentRequests(userId)
        ]);

        const notifications = [];

        // 收到的请求（只显示 pending 状态的）
        for (const req of receivedRequests) {
            if (req.status === 'pending') {
                notifications.push({
                    id: req.id,
                    type: 'received',
                    user_id: req.user_id,
                    username: req.username,
                    avatar_path: req.avatar_path,
                    status: 'pending'
                });
            }
        }

        // 发送的请求（显示 pending/accepted/rejected 状态的，排除 dismissed）
        for (const req of sentRequests) {
            if (req.status === 'pending' || req.status === 'accepted' || req.status === 'rejected') {
                notifications.push({
                    id: req.id,
                    type: 'sent',
                    user_id: req.user_id,
                    username: req.username,
                    avatar_path: req.avatar_path,
                    status: req.status
                });
            }
        }

        return notifications;
    }

    // 删除好友
    static async deleteFriend(userId, friendId) {
        // 检查是否是好友
        const isFriend = await Friend.areFriends(userId, friendId);
        if (!isFriend) {
            throw { code: 400, msg: '对方不是你的好友' };
        }

        await Friend.deleteFriend(userId, friendId);
        return true;
    }

    // 获取好友列表
    static async getFriends(userId) {
        return await Friend.getFriends(userId);
    }

    // 获取与某用户的好友状态
    static async getFriendStatus(userId, targetUserId) {
        return await Friend.getFriendStatus(userId, targetUserId);
    }
}

module.exports = FriendService;
