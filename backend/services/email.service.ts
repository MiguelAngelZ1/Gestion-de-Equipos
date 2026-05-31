const logger = require('../utils/logger');
const nodemailer = require('nodemailer');
const path = require('path');

// Configuración de transporte
// Nota: Usamos EMAIL_USER y EMAIL_PASS según lo solicitado
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || process.env.SMTP_USER,
        pass: process.env.EMAIL_PASS || process.env.SMTP_PASS
    }
});

/**
 * Envía un correo electrónico con el código de recuperación
 * @param {string} to - Email del destinatario
 * @param {string} code - Código de validación generado
 */
const sendRecoveryCode = async (to, code) => {
    // Intentamos obtener la ruta del logo para embeberlo
    const logoRelPath = '../../frontend/src/assets/LogoIMPERIO.webp';
    const logoAbsPath = path.join(__dirname, logoRelPath);

    const mailOptions = {
        from: `"IMPERIO - Gestión de Equipos" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
        to: to,
        subject: "Código de Seguridad - Control de Equipos 3.0",
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa; margin: 0; padding: 0; }
                    .container { max-width: 500px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
                    .header { background: #0f172a; padding: 30px; text-align: center; }
                    .logo { height: 60px; margin-bottom: 10px; }
                    .content { padding: 40px; text-align: center; color: #334155; }
                    h1 { font-size: 22px; margin-bottom: 10px; color: #1e293b; font-weight: 700; }
                    p { font-size: 15px; line-height: 1.6; color: #64748b; margin-bottom: 30px; }
                    .code-box { background: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 12px; padding: 25px; margin: 20px 0; }
                    .code { font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #4f46e5; font-family: 'Courier New', Courier, monospace; }
                    .footer { padding: 25px; text-align: center; background: #f8fafc; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
                    .warning { font-size: 12px; color: #94a3b8; margin-top: 20px; font-style: italic; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <img src="cid:logo" alt="IMPERIO" class="logo">
                    </div>
                    <div class="content">
                        <h1>Recuperación de Acceso</h1>
                        <p>Has solicitado restablecer tu contraseña. Utiliza el siguiente código de seguridad para continuar con el proceso:</p>
                        <div class="code-box">
                            <span class="code">${code}</span>
                        </div>
                        <p class="warning">Este código expira en 15 minutos por razones de seguridad.<br>Si no solicitaste este cambio, puedes ignorar este aviso.</p>
                    </div>
                    <div class="footer">
                        © ${new Date().getFullYear()} IMPERIO SOLUCIONES LOGÍSTICAS<br>
                        Sistema de Control de Equipos 3.0
                    </div>
                </div>
            </body>
            </html>
        `,
        attachments: [{
            filename: 'logo.png',
            path: logoAbsPath,
            cid: 'logo' // mismo ID que en el src="cid:logo"
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
