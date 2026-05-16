const File = require('../models/file');
const User = require('../models/user');
const UserService = require('./userService');
const path = require('path');
const fs = require('fs');

class UploadFileService {
    static async uploadAvatar(file, user_id) {
        const { filename } = file;
        const avatarPath = `/uploads/avatar/${filename}`;

        const oldUser = await User.findByUserId(user_id);
        const oldAvatarPath = oldUser ? oldUser.avatar_path : null;

        const success = await File.updateAvatarPath(user_id, avatarPath);
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

        await UserService.clearProfileCache(user_id);

        return {
            avatarUrl: avatarPath,
            filename
        };
    }

    static async uploadProfileBg(file, user_id) {
        const { filename } = file;
        const profileBgPath = `/uploads/profile_bg/${filename}`;

        const oldUser = await User.findByUserId(user_id);
        const oldProfileBgPath = oldUser ? oldUser.profile_bg : null;

        const success = await File.updateProfileBgPath(user_id, profileBgPath);
        if (!success) {
            throw new Error('背景图更新失败');
        }

        if (oldProfileBgPath) {
            const oldFilename = path.basename(oldProfileBgPath);
            const oldFilePath = path.join('public/uploads/profile_bg', oldFilename);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }

        await UserService.clearProfileCache(user_id);

        return {
            profileBgUrl: profileBgPath,
            filename
        };
    }
}

module.exports = UploadFileService;