const UserService = require('../services/userService');
const QueueService = require('../services/queueService');

class UserController {
    static async updateUsername(req, res) {
        try {
            const { username } = req.body;
            const user_id = req.user_id;

            if (!username) {
                return res.status(400).json({
                    code: 400,
                    msg: '用户名不能为空'
                });
            }

            if (username.length < 1 || username.length > 20) {
                return res.status(400).json({
                    code: 400,
                    msg: '用户名长度必须在1-20个字符之间'
                });
            }

            const usernameRegex = /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/;
            if (!usernameRegex.test(username)) {
                return res.status(400).json({
                    code: 400,
                    msg: '用户名只能包含中文、英文、数字和下划线'
                });
            }

            try {
                await QueueService.publishUserOperation({
                    type: 'update_username',
                    user_id,
                    data: { username }
                });

                res.status(200).json({
                    code: 200,
                    msg: '请求已接收',
                    data: { username }
                });
            } catch (queueError) {
                console.warn('⚠️ 队列不可用，降级为直接写入：', queueError.message);
                const result = await UserService.updateUsername(user_id, username);
                res.status(200).json({
                    code: 200,
                    msg: '用户名修改成功',
                    data: result
                });
            }
        } catch (error) {
            console.error('修改用户名错误：', error);
            res.status(500).json({
                code: 500,
                msg: '服务器内部错误'
            });
        }
    }

    static async updateGender(req, res) {
        try {
            const { gender } = req.body;
            const user_id = req.user_id;

            if (gender !== 0 && gender !== 1 && gender !== 2) {
                return res.status(400).json({
                    code: 400,
                    msg: '性别参数不合法'
                });
            }

            try {
                await QueueService.publishUserOperation({
                    type: 'update_gender',
                    user_id,
                    data: { gender }
                });

                res.status(200).json({
                    code: 200,
                    msg: '请求已接收',
                    data: { gender }
                });
            } catch (queueError) {
                console.warn('⚠️ 队列不可用，降级为直接写入：', queueError.message);
                const result = await UserService.updateGender(user_id, gender);
                res.status(200).json({
                    code: 200,
                    msg: '性别修改成功',
                    data: result
                });
            }
        } catch (error) {
            console.error('修改性别错误：', error);
            res.status(500).json({
                code: 500,
                msg: '服务器内部错误'
            });
        }
    }

    static async searchUsers(req, res) {
        try {
            const { q } = req.query;
            if (!q || !q.trim()) {
                return res.status(400).json({
                    code: 400,
                    msg: '搜索关键词不能为空'
                });
            }

            const users = await UserService.searchUsers(q.trim());
            res.status(200).json({
                code: 200,
                msg: '搜索成功',
                data: users
            });
        } catch (error) {
            console.error('搜索用户错误：', error);
            res.status(500).json({
                code: 500,
                msg: '服务器内部错误'
            });
        }
    }

    static async getUserProfile(req, res) {
        try {
            const { user_id } = req.params;
            if (!user_id) {
                return res.status(400).json({
                    code: 400,
                    msg: '用户ID不能为空'
                });
            }

            const user = await UserService.getUserProfile(user_id);
            res.status(200).json({
                code: 200,
                msg: '查询成功',
                data: user
            });
        } catch (error) {
            if (error.message === '用户不存在') {
                return res.status(404).json({
                    code: 404,
                    msg: '用户不存在'
                });
            }
            console.error('查询用户资料错误：', error);
            res.status(500).json({
                code: 500,
                msg: '服务器内部错误'
            });
        }
    }

    static async updateDes(req, res) {
        try {
            const { des } = req.body;
            const user_id = req.user_id;

            if (des.length > 100) {
                return res.status(400).json({
                    code: 400,
                    msg: '用户描述不能超过100个字符'
                });
            }

            try {
                await QueueService.publishUserOperation({
                    type: 'update_des',
                    user_id,
                    data: { des }
                });

                res.status(200).json({
                    code: 200,
                    msg: '请求已接收',
                    data: { des }
                });
            } catch (queueError) {
                console.warn('⚠️ 队列不可用，降级为直接写入：', queueError.message);
                const result = await UserService.updateDes(user_id, des);
                res.status(200).json({
                    code: 200,
                    msg: '用户描述修改成功',
                    data: result
                });
            }
        } catch (error) {
            console.error('修改用户描述错误：', error);
            res.status(500).json({
                code: 500,
                msg: '服务器内部错误'
            });
        }
    }
}

module.exports = UserController;