const logger = require('../utils/logger');
const nodemailer = require('nodemailer');
const path = require('path');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || process.env.SMTP_USER,
        pass: process.env.EMAIL_PASS || process.env.SMTP_PASS
    }
});

const sendRecoveryCode = async (to, code) => {
    const logoRelPath = '../../frontend/src/assets/LogoIMPERIO.webp';
    const logoAbsPath = path.join(__dirname, logoRelPath);

    const mailOptions = {
        from: `"IMPERIO - Gestión de Equipos" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
        to: to,
        subject: "Código de Seguridad - Control de Equipos",
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Inter', 'Segoe UI', sans-serif; background-color: #09090b; margin: 0; padding: 0; }
                    .container { max-width: 480px; margin: 32px auto; background: #18181b; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; }
                    .header { background: #09090b; padding: 28px; text-align: center; border-bottom: 1px solid #27272a; }
                    .logo { width: 64px; height: 64px; border-radius: 50%; background: #ffffff; padding: 5px; object-fit: contain; }
                    .content { padding: 32px 28px; text-align: center; }
                    h1 { font-size: 18px; font-weight: 800; color: #fafafa; margin: 0 0 8px 0; letter-spacing: -0.02em; }
                    .subtitle { font-size: 13px; line-height: 1.5; color: #a1a1aa; margin: 0 0 24px 0; }
                    .code-box { background: #27272a; border: 1px solid #3f3f46; border-radius: 12px; padding: 14px 16px; margin: 0; }
                    .code { font-size: 28px; font-weight: 800; letter-spacing: 10px; color: #fafafa; font-family: 'Courier New', monospace; user-select: all; }
                    .icon-btn { width: 36px; height: 36px; border-radius: 8px; background: transparent; display: inline-grid; place-items: center; text-decoration: none; }
                    .warning { font-size: 11px; color: #71717a; margin-top: 16px; line-height: 1.5; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <img src="cid:logo" alt="IMPERIO" class="logo">
                    </div>
                    <div class="content">
                        <h1>Recuperación de Acceso</h1>
                        <p class="subtitle">Has solicitado restablecer tu contraseña. Usa el código para continuar:</p>
                        <div class="code-box">
                            <table width="100%" cellpadding="0" cellspacing="0" style="width:100%">
                                <tr>
                                    <td style="width:36px"></td>
                                    <td align="center"><span class="code">${code}</span></td>
                                    <td align="right" style="width:36px">
                                        <a class="icon-btn" href="#" style="color:#ffffff; font-size:18px; text-decoration:none; line-height:1">⧉</a>
                                    </td>
                                </tr>
                            </table>
                        </div>
                        <p class="warning">Expira en 15 minutos. Si no solicitaste este cambio, ignora este mensaje.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        attachments: [{
            filename: 'logo.png',
            path: logoAbsPath,
            cid: 'logo'
        }]
    };

    try {
        const user = process.env.EMAIL_USER || process.env.SMTP_USER;
        const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
        if (!user || !pass) {
            logger.warn({ code }, "Email no configurado. Código de recuperación visible en log.");
            return { success: true, simulated: true };
        }
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        logger.error({ err: error }, "Error enviando email");
        throw new Error("No se pudo enviar el correo de recuperación. Verifica las credenciales.", { cause: error });
    }
};

module.exports = { sendRecoveryCode };
