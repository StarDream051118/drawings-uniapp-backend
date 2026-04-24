const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');

// 用户注册
router.post('/register', AuthController.register);

// 用户登录
router.post('/login', AuthController.login);

// 验证Token
router.post('/verify', AuthController.verify);

module.exports = router;