const UploadFileService = require('../services/uploadFileService');
const path = require('path');

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

            const user_id = req.user_id;
            const result = await UploadFileService.uploadAvatar(file, user_id);

            res.status(200).json({
                code: 200,
                msg: '头像上传成功',
                data: {
                    avatarUrl: result.avatarUrl,
                    filename: result.filename
                }
            });
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

            const user_id = req.user_id;
            const result = await UploadFileService.uploadProfileBg(file, user_id);

            res.status(200).json({
                code: 200,
                msg: '背景图上传成功',
                data: {
                    profileBgUrl: result.profileBgUrl,
                    filename: result.filename
                }
            });
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