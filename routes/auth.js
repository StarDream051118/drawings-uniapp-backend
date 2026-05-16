const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const verifySignature = require('../middleware/verifySignature');

router.post('/register', AuthController.register);

router.post('/verify-register', AuthController.verifyRegister);

router.post('/login', AuthController.login);

router.post('/verify', AuthController.verify);

router.post('/get-sig-token', AuthController.getSigToken);

router.post('/reset-password', AuthController.sendResetCode);

router.post('/verify-reset-password', AuthController.verifyResetPassword);

router.post('/change-password', AuthController.sendChangeCode);

router.post('/verify-change-password', verifySignature, AuthController.verifyChangePassword);

module.exports = router;