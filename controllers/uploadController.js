const UploadFileService = require('../services/uploadFileService');
const QueueService = require('../services/queueService');
const path = require('path');
const fs = require('fs');

class UploadController {
    static async uploadAvatar(req, res) {
        try {
            const file = req.file;

            if (!file) {
                return res.status(400).json({
                    code: 400,
                    msg: '文件不能为空'
                });
            }

            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                return res.status(400).json({
                    code: 400,
                    msg: '文件大小不能超过5MB'
                });
            }

            const ext = path.extname(file.originalname).toLowerCase();
            const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
            if (!allowedExts.includes(ext)) {
                return res.status(400).json({
                    code: 400,
                    msg: '文件后缀不合法，仅支持 jpg/png/webp/gif'
                });
            }

            const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
            if (!allowedMimes.includes(file.mimetype)) {
                return res.status(400).json({
                    code: 400,
                    msg: '文件类型必须为图片'
                });
            }

            const config = require('../config/index');
            const avatarUrl = `/uploads/avatar/${file.filename}`;
            const user_id = req.user_id;

            try {
                const oldUser = await require('../models/user').findByUserId(user_id);
                const oldAvatarPath = oldUser ? oldUser.avatar_path : null;

                await QueueService.publishUserOperation({
                    type: 'update_avatar',
                    user_id,
                    data: { avatar_path: avatarUrl, oldAvatarPath }
                });

                res.status(200).json({
                    code: 200,
                    msg: '头像上传成功',
                    data: {
                        avatarUrl: `${config.BASE_URL}${avatarUrl}`,
                        filename: file.filename
                    }
                });
            } catch (queueError) {
                console.warn('⚠️ 队列不可用，降级为直接写入：', queueError.message);
                const result = await UploadFileService.uploadAvatar(file, user_id);
                res.status(200).json({
                    code: 200,
                    msg: '头像上传成功',
                    data: {
                        avatarUrl: `${config.BASE_URL}${result.avatarUrl}`,
                        filename: result.filename
                    }
                });
            }
        } catch (error) {
            console.error('头像上传错误：', error);
            res.status(500).json({
                code: 500,
                msg: '服务器内部错误'
            });
        }
    }

    static async uploadProfileBg(req, res) {
        try {
            const file = req.file;

            if (!file) {
                return res.status(400).json({
                    code: 400,
                    msg: '文件不能为空'
                });
            }

            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                return res.status(400).json({
                    code: 400,
                    msg: '文件大小不能超过5MB'
                });
            }

            const ext = path.extname(file.originalname).toLowerCase();
            const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
            if (!allowedExts.includes(ext)) {
                return res.status(400).json({
                    code: 400,
                    msg: '文件后缀不合法，仅支持 jpg/png/webp/gif'
                });
            }

            const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
            if (!allowedMimes.includes(file.mimetype)) {
                return res.status(400).json({
                    code: 400,
                    msg: '文件类型必须为图片'
                });
            }

            const config = require('../config/index');
            const profileBgUrl = `/uploads/profile_bg/${file.filename}`;
            const user_id = req.user_id;

            try {
                const oldUser = await require('../models/user').findByUserId(user_id);
                const oldProfileBgPath = oldUser ? oldUser.profile_bg : null;

                await QueueService.publishUserOperation({
                    type: 'update_profile_bg',
                    user_id,
                    data: { profile_bg: profileBgUrl, oldProfileBgPath }
                });

                res.status(200).json({
                    code: 200,
                    msg: '背景图上传成功',
                    data: {
                        profileBgUrl: `${config.BASE_URL}${profileBgUrl}`,
                        filename: file.filename
                    }
                });
            } catch (queueError) {
                console.warn('⚠️ 队列不可用，降级为直接写入：', queueError.message);
                const result = await UploadFileService.uploadProfileBg(file, user_id);
                res.status(200).json({
                    code: 200,
                    msg: '背景图上传成功',
                    data: {
                        profileBgUrl: `${config.BASE_URL}${result.profileBgUrl}`,
                        filename: result.filename
                    }
                });
            }
        } catch (error) {
            console.error('背景图上传错误：', error);
            res.status(500).json({
                code: 500,
                msg: '服务器内部错误'
            });
        }
    }
}

module.exports = UploadController;