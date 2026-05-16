const express = require('express');
const router = express.Router();
const FriendController = require('../controllers/friendController');
const AuthService = require('../services/authService');

async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            code: 401,
            msg: '未提供有效的认证令牌'
        });
    }

    const token = authHeader.substring(7);
    const verifyResult = await AuthService.verifyToken(token);
    if (!verifyResult.valid) {
        return res.status(401).json({
            code: 401,
            msg: '令牌无效或已过期'
        });
    }

    req.user_id = verifyResult.user_id;
    next();
}

router.post('/request', authMiddleware, FriendController.sendRequest);
router.post('/accept', authMiddleware, FriendController.acceptRequest);
router.post('/reject', authMiddleware, FriendController.rejectRequest);
router.delete('/dismiss/:requestId', authMiddleware, FriendController.dismissNotification);
router.get('/notifications', authMiddleware, FriendController.getNotifications);
router.get('/list', authMiddleware, FriendController.getFriends);
router.get('/status/:targetUserId', authMiddleware, FriendController.getFriendStatus);
router.delete('/delete/:friendId', authMiddleware, FriendController.deleteFriend);

module.exports = router;
