const pool = require('../db/index');

class File {
    static async updateAvatarPath(user_id, avatarPath) {
        const sql = 'UPDATE user_data SET avatar_path = ?, updated_at = ? WHERE user_id = ?';
        const formatTime = new Date();
        const [result] = await pool.execute(sql, [avatarPath, formatTime, user_id]);
        return result.affectedRows > 0;
    }
}

module.exports = File;