const amqp = require('amqplib');
const config = require('../config/index');

let connection = null;
let channel = null;

const EXCHANGE_NAME = 'user_ops';
const QUEUE_NAME = 'user_ops_queue';

async function connect() {
    if (connection && channel) {
        return { connection, channel };
    }

    const url = `amqp://${config.rabbitmq.user}:${config.rabbitmq.password}@${config.rabbitmq.host}:${config.rabbitmq.port}`;

    try {
        connection = await amqp.connect(url);
        channel = await connection.createChannel();

        await channel.assertExchange(EXCHANGE_NAME, 'direct', { durable: true });
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, 'user_operation');

        console.log('✅ RabbitMQ 连接成功');

        connection.on('error', (err) => {
            console.error('❌ RabbitMQ 连接错误：', err.message);
            connection = null;
            channel = null;
        });

        connection.on('close', () => {
            console.log('⚠️ RabbitMQ 连接关闭');
            connection = null;
            channel = null;
        });

        return { connection, channel };
    } catch (error) {
        console.error('❌ RabbitMQ 连接失败：', error.message);
        throw error;
    }
}

async function getChannel() {
    if (!channel) {
        await connect();
    }
    return channel;
}

async function close() {
    try {
        if (channel) {
            await channel.close();
            channel = null;
        }
        if (connection) {
            await connection.close();
            connection = null;
        }
        console.log('RabbitMQ 连接已关闭');
    } catch (error) {
        console.error('关闭 RabbitMQ 连接错误：', error.message);
    }
}

module.exports = {
    connect,
    getChannel,
    close,
    EXCHANGE_NAME,
    QUEUE_NAME
};