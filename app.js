const http = require('http');
const { Server } = require('socket.io');
const express = require('express');
const cors = require('cors');
const net = require('net');
const config = require('./config/index');
const socketHandler = require('./socket/socketHandler');
const Consumer = require('./worker/consumer');

// 创建Express实例
const app = express();

// 检测端口是否可用
function checkPortAvailability(port) {
    return new Promise((resolve, reject) => {
        const tester = net.createServer()
            .once('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    reject(new Error(`端口 ${port} 已被占用，请更换端口！`));
                } else {
                    reject(new Error(`端口检测失败：${err.message}`));
                }
            })
            .once('listening', () => {
                tester.close(() => resolve(true));
            })
            .listen(port);
    });
}

// 启动服务
async function startServer() {
    try {
        // 1. 检测端口
        console.log(`🔍 正在检测端口 ${config.port} 是否可用...`);
        await checkPortAvailability(config.port);
        console.log(`✅ 端口 ${config.port} 可用`);

        // 中间件配置
        app.use(cors({
            origin: "*", // 开发环境允许所有源
            credentials: true
        }));
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        app.use('/uploads', express.static('public/uploads'));

        // 健康检查接口
        app.get('/api/health', (req, res) => {
            res.json({
                code: 200,
                msg: '服务运行正常',
                data: {
                    port: config.port,
                    time: new Date().toLocaleString(),
                    service: 'drawings-uniapp-backend'
                }
            });
        });

        // 路由导入
        const authRoutes = require('./routes/auth');
        const userRoutes = require('./routes/user');
        app.use('/api/auth', authRoutes);
        app.use('/api/user', userRoutes);

        // 创建HTTP服务器和Socket.io实例
        const server = http.createServer(app);
        const io = new Server(server, {
            cors: {
                origin: "*", // 开发环境允许所有源
                methods: ["GET", "POST"]
            }
        });

        // 初始化Socket.io控制
        socketHandler(io);

        // 启动服务
        server.listen(config.port, async () => {
            console.log(`🚀 drawings-uniapp-backend 服务运行在：http://localhost:${config.port}`);
            console.log(`📌 当前环境：${config.env}`);
            console.log(`🏥 检查接口健康：http://localhost:${config.port}/api/health`);

            // 启动消息队列消费者
            try {
                await Consumer.start();
            } catch (error) {
                console.error('❌ 消费者启动失败：', error.message);
            }
        });

    } catch (err) {
        console.error('❌ 服务启动失败：', err.message);
        process.exit(1);
    }
}

// 启动服务
startServer();