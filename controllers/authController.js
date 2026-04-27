const AuthService = require('../services/authService');
const EmailService = require('../services/emailService');
const CodeService = require('../services/codeService');
const User = require('../models/user');

class AuthController {
    static validateUsername(username) {
        if (!username) {
            return { valid: false, msg: '用户名不能为空' };
        }
        if (username.length < 1 || username.length > 20) {
            return { valid: false, msg: '用户名长度必须在1-20个字符之间' };
        }
        const usernameRegex = /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(username)) {
            return { valid: false, msg: '用户名只能包含中文、英文、数字和下划线' };
        }
        return { valid: true };
    }

    static validateAccount(account) {
        if (!account) {
            return { valid: false, msg: '账号不能为空' };
        }
        if (account.length < 8 || account.length > 20) {
            return { valid: false, msg: '账号长度必须在8-20个字符之间' };
        }
        const accountRegex = /^[a-zA-Z0-9_]+$/;
        if (!accountRegex.test(account)) {
            return { valid: false, msg: '账号只能包含英文、数字和下划线' };
        }
        return { valid: true };
    }

    static validateEmail(email) {
        if (!email) {
            return { valid: false, msg: '邮箱不能为空' };
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { valid: false, msg: '邮箱格式不正确' };
        }
        return { valid: true };
    }

    static validatePassword(password) {
        if (!password) {
            return { valid: false, msg: '密码不能为空' };
        }
        if (password.length < 6 || password.length > 20) {
            return { valid: false, msg: '密码限制6-20字符' };
        }
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
        if (!passwordRegex.test(password)) {
            return { valid: false, msg: '密码必须包含大小写字母和数字' };
        }
        return { valid: true };
    }

    static async register(req, res) {
        try {
            const { username, account, password, email } = req.body;

            const usernameCheck = AuthController.validateUsername(username);
            if (!usernameCheck.valid) {
                return res.status(400).json({ code: 400, msg: usernameCheck.msg });
            }

            const accountCheck = AuthController.validateAccount(account);
            if (!accountCheck.valid) {
                return res.status(400).json({ code: 400, msg: accountCheck.msg });
            }

            const emailCheck = AuthController.validateEmail(email);
            if (!emailCheck.valid) {
                return res.status(400).json({ code: 400, msg: emailCheck.msg });
            }

            const passwordCheck = AuthController.validatePassword(password);
            if (!passwordCheck.valid) {
                return res.status(400).json({ code: 400, msg: passwordCheck.msg });
            }

            const existingEmail = await User.findByEmail(email);
            if (existingEmail) {
                return res.status(409).json({ code: 409, msg: '该邮箱已被注册' });
            }

            const existingAccount = await User.findByAccount(account);
            if (existingAccount) {
                return res.status(409).json({ code: 409, msg: '该账号已被注册' });
            }

            const interval = await CodeService.sendIntervalCheck(email);
            if (interval > 0) {
                return res.status(429).json({
                    code: 429,
                    msg: `请 ${interval} 秒后再试`
                });
            }

            const code = CodeService.generateCode();
            await CodeService.saveCode(email, 'register', code);
            await EmailService.sendCode(email, code, 'register');

            res.status(200).json({
                code: 200,
                msg: '验证码已发送',
                data: {
                    needsVerify: true,
                    email
                }
            });
        } catch (error) {
            console.error('注册错误：', error);
            res.status(500).json({
                code: 500,
                msg: '服务器内部错误'
            });
        }
    }

    static async verifyRegister(req, res) {
        try {
            const { username, account, password, email, authCode } = req.body;

            const usernameCheck = AuthController.validateUsername(username);
            if (!usernameCheck.valid) {
                return res.status(400).json({ code: 400, msg: usernameCheck.msg });
            }

            const accountCheck = AuthController.validateAccount(account);
            if (!accountCheck.valid) {
                return res.status(400).json({ code: 400, msg: accountCheck.msg });
            }

            const emailCheck = AuthController.validateEmail(email);
            if (!emailCheck.valid) {
                return res.status(400).json({ code: 400, msg: emailCheck.msg });
            }

            const passwordCheck = AuthController.validatePassword(password);
            if (!passwordCheck.valid) {
                return res.status(400).json({ code: 400, msg: passwordCheck.msg });
            }

            if (!authCode) {
                return res.status(400).json({ code: 400, msg: '验证码不能为空' });
            }

            const result = await CodeService.verifyCode(email, 'register', authCode);
            if (!result.valid) {
                return res.status(400).json({ code: 400, msg: result.msg });
            }

            const userResult = await AuthService.register({ username, account, password, email });

            res.status(201).json({
                code: 201,
                msg: '注册成功',
                data: {
                    user: userResult.user,
                    token: userResult.token
                }
            });
        } catch (error) {
            if (error.message === '账号已被注册' || error.message === '邮箱已被注册') {
                return res.status(409).json({ code: 409, msg: error.message });
            }
            console.error('注册错误：', error);
            res.status(500).json({
                code: 500,
                msg: '服务器内部错误'
            });
        }
    }

    static async login(req, res) {
        try {
            const { account, password } = req.body;

            if (!account || !password) {
                return res.status(400).json({
                    code: 400,
                    msg: '账号、密码不能为空'
                });
            }

            if (account.length < 8 || account.length > 20) {
                return res.status(400).json({
                    code: 400,
                    msg: '账号长度必须在8-20个字符之间'
                });
            }

            if (password.length < 6 || password.length > 20) {
                return res.status(400).json({
                    code: 400,
                    msg: '密码限制6-20字符'
                });
            }

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
            if (error.message === '用户不存在') {
                return res.status(400).json({
                    code: 400,
                    msg: '用户不存在'
                });
            }
            if (error.message === '密码错误') {
                return res.status(400).json({
                    code: 400,
                    msg: '密码错误'
                });
            }
            console.error('登录错误：', error);
            res.status(500).json({
                code: 500,
                msg: '服务器内部错误'
            });
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
                    msg: '登录已过期请重新登录'
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

    static async sendResetCode(req, res) {
        try {
            const { account, email } = req.body;

            if (!account) {
                return res.status(400).json({ code: 400, msg: '账号不能为空' });
            }

            const emailCheck = AuthController.validateEmail(email);
            if (!emailCheck.valid) {
                return res.status(400).json({ code: 400, msg: emailCheck.msg });
            }

            const existingAccount = await User.findByAccount(account);
            if (!existingAccount) {
                return res.status(404).json({ code: 404, msg: '该账号不存在' });
            }

            const existingEmail = await User.findByEmail(email);
            if (!existingEmail) {
                return res.status(404).json({ code: 404, msg: '该邮箱未注册' });
            }

            if (existingAccount.email !== email) {
                return res.status(400).json({ code: 400, msg: '账号与邮箱不匹配' });
            }

            const interval = await CodeService.sendIntervalCheck(email);
            if (interval > 0) {
                return res.status(429).json({
                    code: 429,
                    msg: `请 ${interval} 秒后再试`
                });
            }

            const code = CodeService.generateCode();
            await CodeService.saveCode(email, 'reset_password', code);
            await EmailService.sendCode(email, code, 'reset_password');

            res.status(200).json({
                code: 200,
                msg: '验证码已发送',
                data: {
                    needsVerify: true,
                    email
                }
            });
        } catch (error) {
            console.error('发送重置验证码错误：', error);
            res.status(500).json({
                code: 500,
                msg: '服务器内部错误'
            });
        }
    }

    static async verifyResetPassword(req, res) {
        try {
            const { email, authCode, newPassword } = req.body;

            const emailCheck = AuthController.validateEmail(email);
            if (!emailCheck.valid) {
                return res.status(400).json({ code: 400, msg: emailCheck.msg });
            }

            const passwordCheck = AuthController.validatePassword(newPassword);
            if (!passwordCheck.valid) {
                return res.status(400).json({ code: 400, msg: passwordCheck.msg });
            }

            if (!authCode) {
                return res.status(400).json({ code: 400, msg: '验证码不能为空' });
            }

            const result = await CodeService.verifyCode(email, 'reset_password', authCode);
            if (!result.valid) {
                return res.status(400).json({ code: 400, msg: result.msg });
            }

            await AuthService.resetPassword(email, newPassword);

            res.status(200).json({
                code: 200,
                msg: '密码重置成功'
            });
        } catch (error) {
            console.error('重置密码错误：', error);
            res.status(500).json({
                code: 500,
                msg: '服务器内部错误'
            });
        }
    }
}

module.exports = AuthController;