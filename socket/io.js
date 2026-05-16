// Socket.io 实例管理（保留用于需要直接访问 io 的场景）
const { setIO: setBroadcastIO } = require('./broadcast');

let io = null;

function setIO(ioInstance) {
    io = ioInstance;
    // 同时设置广播模块的 io 实例
    setBroadcastIO(ioInstance);
}

function getIO() {
    return io;
}

module.exports = { setIO, getIO };
