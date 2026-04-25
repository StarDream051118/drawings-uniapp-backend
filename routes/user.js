const express = require('express');
const router = express.Router();
const UploadController = require('../controllers/uploadController');
const UserController = require('../controllers/userController');
const AuthService = require('../services/authService');
const multer = require('multer');
const path = require('path');

const avatarStorage = multer.diskStorage({
    destination: function (req, file, cb){
        cb(null, 'public/uploads/avatar/')
    },
    filename: function(req, file, cb){
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const profileBgStorage = multer.diskStorage({
    destination: function (req, file, cb){
        cb(null, 'public/uploads/profile_bg/')
    },
    filename: function(req, file, cb){
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-bg-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadAvatar = multer({
    storage: avatarStorage,
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

const uploadProfileBg = multer({
    storage: profileBgStorage,
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

router.post('/avatar', authMiddleware, uploadAvatar.single('avatar'), UploadController.uploadAvatar);
router.post('/profile-bg', authMiddleware, uploadProfileBg.single('profile_bg'), UploadController.uploadProfileBg);
router.put('/username', authMiddleware, UserController.updateUsername);
router.put('/gender', authMiddleware, UserController.updateGender);
router.put('/des', authMiddleware, UserController.updateDes);

module.exports = router;