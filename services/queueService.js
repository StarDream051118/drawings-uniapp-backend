const rabbitmq = require('../db/rabbitmq');
const User = require('../models/user');
const File = require('../models/file');
const path = require('path');
const fs = require('fs');

class QueueService {
    static async publishUserOperation(operation) {
        const { type, user_id, data } = operation;
        const message = JSON.stringify({
            type,
            user_id,
            data,
            timestamp: Date.now()
        });

        const channel = await rabbitmq.getChannel();
        channel.publish(
            rabbitmq.EXCHANGE_NAME,
            'user_operation',
            Buffer.from(message),
            { persistent: true }
        );

        console.log(`📤 消息已发布: ${type} - user_id: ${user_id}`);
    }

    static async processMessage(message) {
        const { type, user_id, data } = message;

        console.log(`⚙️ 处理消息: ${type} - user_id: ${user_id}`);

        try {
            switch (type) {
                case 'update_username':
                    await User.updateUsername(user_id, data.username);
                    break;

                case 'update_gender':
                    await User.updateGender(user_id, data.gender);
                    break;

                case 'update_des':
                    await User.updateDes(user_id, data.des);
                    break;

                case 'update_avatar':
                    await File.updateAvatarPath(user_id, data.avatar_path);
                    if (data.oldAvatarPath) {
                        const oldFilename = path.basename(data.oldAvatarPath);
                        const oldFilePath = path.join('public/uploads/avatar', oldFilename);
                        if (fs.existsSync(oldFilePath)) {
                            fs.unlinkSync(oldFilePath);
                        }
                    }
                    break;

                case 'update_profile_bg':
                    await File.updateProfileBgPath(user_id, data.profile_bg);
                    if (data.oldProfileBgPath) {
                        const oldFilename = path.basename(data.oldProfileBgPath);
                        const oldFilePath = path.join('public/uploads/profile_bg', oldFilename);
                        if (fs.existsSync(oldFilePath)) {
                            fs.unlinkSync(oldFilePath);
                        }
                    }
                    break;

                default:
                    console.warn(`⚠️ 未知操作类型: ${type}`);
            }

            return { success: true };
        } catch (error) {
            console.error(`❌ 处理消息失败: ${type} - ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}

module.exports = QueueService;