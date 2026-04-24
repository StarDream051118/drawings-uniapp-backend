const express = require('express');
const router = express.Router();
const UploadController = require('../controllers/uploadController');
const multer = require('multer');
const path = require('path');

// multer配置储存
const storage = multer.diskStorage({
    destination: function (req, file, cb){
        cb(null, 'public/uploads/avatar/')
    },
    filename: function(req, file, cb){
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// 创建multer实例
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

// 用户头像上传
router.post('/avatar', upload.single('avatar'), UploadController.uploadAvatar);

module.exports = router;