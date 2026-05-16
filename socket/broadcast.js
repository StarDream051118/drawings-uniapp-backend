// 统一广播模块 - 同时向 Socket.io 和 WebSocket 客户端广播

let io = null;
let wsBroadcast = null;

function setIO(ioInstance) {
    io = ioInstance;
}

function setWSBroadcast(fn) {
    wsBroadcast = fn;
}

function broadcastToRoom(roomName, event, data) {
    console.log(`[Broadcast] 广播到房间 ${roomName}, 事件: ${event}, io: ${!!io}, wsBroadcast: ${!!wsBroadcast}`);
    // 广播到 Socket.io 客户端
    if (io) {
        const room = io.sockets.adapter.rooms.get(roomName);
        const clientCount = room ? room.size : 0;
        console.log(`[Broadcast] Socket.io 房间 ${roomName} 有 ${clientCount} 个客户端`);
        io.to(roomName).emit(event, data);
    }
    // 广播到原生 WebSocket 客户端
    if (wsBroadcast) {
        wsBroadcast(roomName, event, data);
    }
}

module.exports = { setIO, setWSBroadcast, broadcastToRoom };
