const { google } = require('googleapis');
const readline = require('readline');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost'; // El OOB está deprecado, usamos localhost

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ ERROR: Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en el archivo .env');
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

console.log('--- PASO 1 ---');
console.log('Abre la siguiente URL en tu navegador web y autoriza con tu cuenta de Google:');
console.log(' ');
console.log(authUrl);
console.log(' ');

// Pide el código
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

console.log('--- PASO 2 ---');
console.log('1. Al autorizar, tu navegador te reedirigirá a una página que dice "No se puede acceder a este sitio web".');
console.log('2. Todo está bien. Fíjate en la BARRA DE DIRECCIONES (la URL arriba en tu navegador).');
console.log('3. Verás algo como: http://localhost/?state=xyz&code=4/0Aea...&scope...');
console.log('4. Copia TODO el enlace (desde http...) y pégalo aquí abajo.');
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

        console.log('\n✅ ¡ÉXITO ROTUNDO! Autorización completada.');
        console.log('========================================================================');
        console.log('✨ EL REFRESH TOKEN SE HA GUARDADO AUTOMÁTICAMENTE EN TU ARCHIVO .env');
        console.log('========================================================================');
        console.log('\nTu sistema Control de Equipos ya está listo para subir respaldos a Google Drive.');
    } catch (error) {
        console.error('\n❌ Error intercambiando el código de acceso:', error.message);
        if (error.response && error.response.data) {
            console.error('Detalles del error:', error.response.data);
        }
    } finally {
        rl.close();
    }
});
