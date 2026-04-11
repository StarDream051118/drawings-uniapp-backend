const jwt = require('jsonwebtoken');

function initSocket(io) {
    // Middleware for authentication
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.headers.token;
        if (!token) {
            return next(new Error('Authentication error'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            // Handle user_id mapping if needed
            if (socket.user.id && !socket.user.user_id) {
                socket.user.user_id = socket.user.id;
            }
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.user.user_id}`);

        // Join user's private room
        const userId = socket.user.user_id;
        socket.join(`user_${userId}`);

        // 这里可以添加新的socket事件处理逻辑
        // 例如：实时协作、通知等

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });
}

module.exports = initSocket;