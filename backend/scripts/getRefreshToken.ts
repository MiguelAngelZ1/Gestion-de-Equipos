const logger = require('../utils/logger');
const { google } = require('googleapis');
const readline = require('readline');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost'; // El OOB está deprecado, usamos localhost

if (!CLIENT_ID || !CLIENT_SECRET) {
    logger.error('Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en el archivo .env');
    process.exit(1);
}

const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

// Genera la URL de autenticación
const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline', // Importante: esto nos da el Refresh Token
    prompt: 'consent', // Fuerza siempre a dar el token
    login_hint: 'miguelangelimperio@gmail.com', // PRE-SELECCIONA EL CORREO AUTOMATICAMENTE
    scope: ['https://www.googleapis.com/auth/drive.file'] // Solo permiso para los archivos que la app cree
});

logger.info('--- PASO 1 ---');
logger.info('Abre la siguiente URL en tu navegador web y autoriza con tu cuenta de Google:');
logger.info(' ');
logger.info(authUrl);
logger.info(' ');

// Pide el código
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

logger.info('--- PASO 2 ---');
logger.info('1. Al autorizar, tu navegador te reedirigirá a una página que dice "No se puede acceder a este sitio web".');
logger.info('2. Todo está bien. Fíjate en la BARRA DE DIRECCIONES (la URL arriba en tu navegador).');
logger.info('3. Verás algo como: http://localhost/?state=xyz&code=4/0Aea...&scope...');
logger.info('4. Copia TODO el enlace (desde http...) y pégalo aquí abajo.');
rl.question('\n▶️ Pega tu enlace completo o código aquí y presiona Enter: ', async (inputRaw) => {
    try {
        // Extrae el código si pegó el enlace completo
        let code = inputRaw.trim();
        if (code.includes('code=')) {
            const urlObj = new URL(code);
            code = urlObj.searchParams.get('code');
        }

        const { tokens } = await oAuth2Client.getToken(code);

        // Guardar automáticamente en .env
        const envPath = require('path').resolve(__dirname, '../.env');
        const fs = require('fs');
        let envVal = fs.readFileSync(envPath, 'utf8');

        if (envVal.includes('GOOGLE_REFRESH_TOKEN=')) {
            envVal = envVal.replace(/GOOGLE_REFRESH_TOKEN=.*/g, `GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"`);
        } else {
            envVal += `\nGOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"`;
        }
        fs.writeFileSync(envPath, envVal);

        logger.info('Autorización completada. El refresh token se ha guardado en .env');
    } catch (error) {
        logger.error({ err: error.message }, 'Error intercambiando el código de acceso');
        if (error.response && error.response.data) {
            logger.error({ err: error.response.data }, 'Detalles del error');
        }
    } finally {
        rl.close();
    }
});
