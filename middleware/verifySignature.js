const Signature = require('../utils/signature');

const verifySignature = async (req, res, next) => {
    try {
        const { sig_token } = req.body;

        if (!sig_token) {
            return res.status(400).json({
                code: 400,
                msg: '缺少签名令牌'
            });
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                code: 401,
                msg: '未提供有效的认证令牌'
            });
        }

        const token = authHeader.substring(7);
        const jwtUtils = require('../utils/jwt');
        const decoded = jwtUtils.verifyToken(token);

        if (!decoded) {
            return res.status(401).json({
                code: 401,
                msg: '登录已过期请重新登录'
            });
        }

        const user_id = decoded.user_id;
        const operationType = req.body.operation_type || 'default';

        const result = await Signature.verifySigToken(operationType, user_id, sig_token);

        if (!result.valid) {
            return res.status(400).json({
                code: 400,
                msg: result.msg
            });
        }

        next();
    } catch (error) {
        console.error('签名验证错误：', error);
        return res.status(500).json({
            code: 500,
            msg: '服务器内部错误'
        });
    }
};

module.exports = verifySignature;