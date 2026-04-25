const express = require('express');
const router = express.Router();
const UploadController = require('../controllers/uploadController');
const AuthService = require('../services/authService');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb){
        cb(null, 'public/uploads/avatar/')
    },
    filename: function(req, file, cb){
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1
    },
    fileFilter: function(req, file, cb){
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (allowedMimes.includes(file.mimetype)){
            cb(null, true);
        } else {
            cb(new Error('只允许上传图片文件'), false);
        }
    }
});

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

router.post('/avatar', authMiddleware, upload.single('avatar'), UploadController.uploadAvatar);

module.exports = router;