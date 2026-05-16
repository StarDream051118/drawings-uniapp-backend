const nodemailer = require('nodemailer');
const config = require('../config/index');

class EmailService {
    static createTransporter() {
        return nodemailer.createTransport({
            host: config.email.host,
            port: config.email.port,
            secure: true,
            auth: {
                user: config.email.user,
                pass: config.email.pass
            }
        });
    }

    static async sendCode(email, code, type, username) {
        const transporter = this.createTransporter();

        const subject = type === 'register'
            ? '【Drawings团队】注册验证码'
            : '【Drawings团队】重置密码验证码';

        const greeting = username ? `您好，${username}！` : '您好！';

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">${greeting}</h2>
                <p style="color: #666; font-size: 16px;">
                    您的验证码是：
                </p>
                <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; color: #333; letter-spacing: 8px;">
                        ${code}
                    </span>
                </div>
                <p style="color: #999; font-size: 14px;">
                    验证码 <span style="color: #e74c3c;">${config.codeExpireTime} 分钟</span> 内有效，请勿泄露给他人。
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #999; font-size: 12px;">
                    如果您没有进行相关操作，请忽略此邮件。
                </p>
            </div>
        `;

        const mailOptions = {
            from: `"Drawings" <${config.email.user}>`,
            to: email,
            subject,
            html
        };

        await transporter.sendMail(mailOptions);
    }
}

module.exports = EmailService;