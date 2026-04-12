const jwt = require('jsonwebtoken');
const config = require('../config/index');

// 生成JWT令牌
function generateToken(user) {
    return jwt.sign(
        {
            user_id: user.user_id,
            username: user.username
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );
}

// 验证JWT令牌
function verifyToken(token) {
    try {
        return jwt.verify(token, config.jwt.secret);
    } catch (error) {
        return null;
    }
}

module.exports = {
    generateToken,
    verifyToken
}