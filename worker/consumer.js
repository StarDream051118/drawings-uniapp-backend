const rabbitmq = require('../db/rabbitmq');
const QueueService = require('../services/queueService');

class Consumer {
    static async start() {
        try {
            const channel = await rabbitmq.getChannel();

            channel.prefetch(3);

            console.log('👤 消费者已启动，等待消息...');

            channel.consume(rabbitmq.QUEUE_NAME, async (msg) => {
                if (!msg) return;

                try {
                    const content = JSON.parse(msg.content.toString());
                    console.log(`📥 收到消息: ${content.type}`);

                    const result = await QueueService.processMessage(content);

                    if (result.success) {
                        channel.ack(msg);
                        console.log(`✅ 消息处理成功: ${content.type}`);
                    } else {
                        channel.nack(msg, false, true);
                        console.log(`⚠️ 消息处理失败，将重试: ${content.type} - ${result.error}`);
                    }
                } catch (error) {
                    channel.nack(msg, false, true);
                    console.error(`❌ 消息解析/处理错误: ${error.message}`);
                }
            }, { noAck: false });

        } catch (error) {
            console.error('❌ 消费者启动失败：', error.message);
            process.exit(1);
        }
    }
}

module.exports = Consumer;