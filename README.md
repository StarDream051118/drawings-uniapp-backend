# Drawings Uniqpp Backend

基于Socket.io的后端服务，专为drawings-uniqpp应用设计。

## 项目结构

```
drawings-uniqpp-backend/
├── app.js              # 主应用文件
├── package.json        # 依赖配置
├── .env               # 环境变量
├── README.md          # 项目说明
├── config/
│   └── index.js       # 配置文件
└── socket/
    └── socketHandler.js # Socket.io处理器
```

## 功能特性

- ✅ Socket.io实时通信
- ✅ JWT身份验证中间件
- ✅ CORS跨域支持
- ✅ 健康检查接口
- ✅ 环境变量配置

## 安装和运行

1. 安装依赖：
```bash
npm install
```

2. 配置环境变量：
复制`.env.example`为`.env`并修改配置：
```bash
cp .env.example .env
```

3. 运行开发服务器：
```bash
npm run dev
```

4. 运行生产服务器：
```bash
npm start
```

## 接口说明

### 健康检查
- `GET /api/health` - 服务健康状态检查

## Socket.io事件

### 连接要求
客户端连接时需要提供JWT token：
```javascript
// 连接示例
const socket = io('http://localhost:3002', {
  auth: {
    token: 'your_jwt_token_here'
  }
});
```

### 可用事件
- `connection` - 用户连接
- `disconnect` - 用户断开连接

## 配置说明

### 环境变量
- `PORT` - 服务端口（默认：3002）
- `NODE_ENV` - 环境模式（development/production）
- `JWT_SECRET` - JWT密钥
- `JWT_EXPIRES_IN` - JWT过期时间

## 开发说明

这是一个纯净的Socket.io后端，只包含基本的实时通信功能。可以根据具体需求添加新的socket事件处理逻辑。