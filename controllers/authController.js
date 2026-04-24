const AuthService = require('../services/authService');

class AuthController {
    // 注册接口
    static async register(req, res) {
        try {
            const { username, account, password, email } = req.body;

            // 1.参数验证
            if (!username || !account || !email || !password){
                return res.status(400).json({
                    code: 400,
                    msg: '用户名、账号、邮箱、密码不能为空'
                });
            }

            // 2.用户名验证
            // 用户名格式验证（1-20字符，中文/英文/数字/下划线）
            if (username.length < 1 || username.length > 20) {
                return res.status(400).json({
                    code: 400,
                    msg: '用户名长度必须在1-20个字符之间'
                });
            }
            const usernameRegex = /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/
            if (!usernameRegex.test(username)) {
                return res.status(400).json({
                    code: 400,
                    msg: '用户名只能包含中文、英文、数字和下划线'
                });
            }

            // 3.账号验证
            // 账号格式验证（8-20字符，英文/数字/下划线）
            if (account.length < 8 || account.length > 20) {
                return res.status(400).json({
                    code: 400,
                    msg: '账号长度必须在8-20个字符之间'
                });
            }
            const accountRegex = /^[a-zA-Z0-9_]+$/
            if (!accountRegex.test(account)) {
                return res.status(400).json({
                    code: 400,
                    msg: '账号只能包含英文、数字和下划'
                });
            }

            // 4.邮箱验证
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    code: 400,
                    msg: '邮箱格式不正确'
                });
            }

            // 5.密码验证
            // 密码格式验证（限制6-20字符，必须包含大小写字母和数字）
            if (password.length < 6 || password.length > 20) {
                return res.status(400).json({
                    code: 400,
                    msg: '密码限制6-20字符'
                });
            }
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/
            if (!passwordRegex.test(password)) {
                return res.status(400).json({
                    code: 400,
                    msg: '密码必须包含大小写字母和数字'
                });
            }

            // 6.调用服务注册层
            const result = await AuthService.register({ username, account, password, email });

            // 7.返回成功响应
            res.status(201).json({
                code: 201,
                msg: '注册成功',
                data: {
                    user: result.user,
                    token: result.token
                }
            });
        } catch (error) {
            // 8.错误处理
            if (error.message === '账号已被注册' || error.message === '邮箱已被注册'){
                return res.status(409).json({
                    code: 409,
                    msg: error.message
                });
            }

            console.error('注册错误：', error);
            res.status(500).json({
                code: 500,
                msg: '服务器内部错误'
            });
        }
    }

    // 登录接口
    static async login(req, res){
        try {
            const { account, password } = req.body;

            // 1.参数校验
            if (!account || !password){
                return res.status(400).json({
                    code: 400,
                    msg: '账号、密码不能为空'
                });
            }

            // 2.账号长度校验
            if (account.length < 8 || account.length > 20) {
                return res.status(400).json({
                    code: 400,
                    msg: '账号长度必须在8-20个字符之间'
                });
            }

            // 3.密码长度校验
            if (password.length < 6 || password.length > 20) {
                return res.status(400).json({
                    code: 400,
                    msg: '密码限制6-20字符'
                });
            }

            // 4.调用服务登录层
            const result = await AuthService.login({ account, password });
            res.status(200).json({
                code: 200,
                msg: '登录成功',
                data: {
                    user: result.user,
                    token: result.token
                }
            });
        } catch (error) {
            if (error.message === '用户不存在'){
                return res.status(400).json({
                    code: 400,
                    msg: '用户不存在'
                });
            }
            if (error.message === '密码错误'){
                return res.status(400).json({
                    code: 400,
                    msg: '密码错误'
                });
            }
        }
    }

    static async verify(req, res) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    code: 401,
                    msg: '未提供有效的认证令牌'
                });
            }

            const token = authHeader.substring(7);
            const result = await AuthService.verifyToken(token);

            if (!result.valid) {
                return res.status(401).json({
                    code: 401,
                    msg: '令牌无效或已过期'
                });
            }

            res.status(200).json({
                code: 200,
                msg: '令牌有效',
                data: {
                    user_id: result.user_id
                }
            });
        } catch (error) {
            console.error('验证令牌错误：', error);
            res.status(500).json({
                code: 500,
                msg: '服务器内部错误'
            });
        }
    }
}

module.exports = AuthController;