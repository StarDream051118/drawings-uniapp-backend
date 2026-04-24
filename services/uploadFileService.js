const File = require('../models/file');
const User = require('../models/user');
const config = require('../config/index');
const path = require('path');
const fs = require('fs');

class UploadFileService {
    static async uploadAvatar(file, user_id) {
        const { filename } = file;
        const avatarUrl = `${config.BASE_URL}/uploads/avatar/${filename}`;

        const oldUser = await User.findByUserId(user_id);
        const oldAvatarPath = oldUser ? oldUser.avatar_path : null;

        const success = await File.updateAvatarPath(user_id, avatarUrl);
        if (!success) {
            throw new Error('头像更新失败');
        }

        if (oldAvatarPath) {
            const oldFilename = path.basename(oldAvatarPath);
            const oldFilePath = path.join('public/uploads/avatar', oldFilename);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }

        return {
            avatarUrl,
            filename
        };
    }
}

module.exports = UploadFileService;