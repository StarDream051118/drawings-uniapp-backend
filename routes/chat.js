const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/chatController');
const AuthService = require('../services/authService');
const multer = require('multer');
const path = require('path');

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

// Multer 配置
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/uploads/chat'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

router.get('/session/:targetUserId', authMiddleware, ChatController.getOrCreateSession);
router.get('/sessions', authMiddleware, ChatController.getSessions);
router.get('/messages/:sessionId', authMiddleware, ChatController.getMessages);
router.post('/messages', authMiddleware, ChatController.sendMessage);
router.put('/read/:sessionId', authMiddleware, ChatController.markAsRead);
router.delete('/session/:sessionId', authMiddleware, ChatController.deleteSession);
router.post('/upload', authMiddleware, upload.single('file'), ChatController.uploadImage);

module.exports = router;
