#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🤖 CONFIGURACIÓN RÁPIDA DEL BOT DE ARBITRAJE CEX\n');

async function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function setupBot() {
    try {
        console.log('=== CONFIGURACIÓN BÁSICA ===');
        
        const mode = await question('¿Modo de trading? (simulation/live) [simulation]: ') || 'simulation';
        const balance = await question('¿Balance inicial en USD? [10000]: ') || '10000';
        const minProfit = await question('¿Ganancia mínima %? [0.2]: ') || '0.2';
        
        console.log('\n=== EXCHANGES ===');
        
        const binanceKey = await question('Binance API Key (opcional): ');
        const binanceSecret = await question('Binance API Secret (opcional): ');
        
        const coinbaseKey = await question('Coinbase API Key (opcional): ');
        const coinbaseSecret = await question('Coinbase API Secret (opcional): ');
        const coinbasePassphrase = await question('Coinbase Passphrase (opcional): ');
        
        console.log('\n=== NOTIFICACIONES ===');
        
        const email = await question('Tu email para alertas (opcional): ');
        const emailPassword = await question('App Password de Gmail (opcional): ');
        
        const telegramToken = await question('Telegram Bot Token (opcional): ');
        const telegramChat = await question('Telegram Chat ID (opcional): ');
        
        console.log('\n=== ESTRATEGIAS ===');
        
        const basicEnabled = await question('¿Habilitar arbitraje básico? (y/n) [y]: ') || 'y';
        const triangularEnabled = await question('¿Habilitar arbitraje triangular? (y/n) [n]: ') || 'n';
        const mlEnabled = await question('¿Habilitar IA/ML? (y/n) [y]: ') || 'y';
        
        // Crear archivo .env
        const envContent = `# Configuración generada automáticamente
NODE_ENV=production
BOT_MODE=${mode}

# Exchanges
BINANCE_API_KEY=${binanceKey}
BINANCE_API_SECRET=${binanceSecret}
COINBASE_API_KEY=${coinbaseKey}
COINBASE_API_SECRET=${coinbaseSecret}
COINBASE_PASSPHRASE=${coinbasePassphrase}

# Seguridad
JWT_SECRET=${generateRandomString(64)}
ENCRYPTION_KEY=${generateRandomString(32)}

# Notificaciones
EMAIL_USER=${email}
EMAIL_PASS=${emailPassword}
TELEGRAM_BOT_TOKEN=${telegramToken}
TELEGRAM_CHAT_ID=${telegramChat}
`;

        fs.writeFileSync('.env', envContent);
        
        // Actualizar configuración
        const configPath = './src/strategies/config.js';
        let configContent = fs.readFileSync(configPath, 'utf8');
        
        // Reemplazar valores
        configContent = configContent.replace(/TRADING_MODE: ".*"/, `TRADING_MODE: "${mode}"`);
        configContent = configContent.replace(/INITIAL_BALANCE: \d+/, `INITIAL_BALANCE: ${balance}`);
        configContent = configContent.replace(/minProfitPercentage: [\d.]+/, `minProfitPercentage: ${minProfit}`);
        
        // Habilitar/deshabilitar estrategias
        configContent = configContent.replace(/BASIC: {\s*enabled: \w+/, `BASIC: {\n        enabled: ${basicEnabled === 'y'}`);
        configContent = configContent.replace(/TRIANGULAR: {\s*enabled: \w+/, `TRIANGULAR: {\n        enabled: ${triangularEnabled === 'y'}`);
        configContent = configContent.replace(/ML: {\s*enabled: \w+/, `ML: {\n        enabled: ${mlEnabled === 'y'}`);
        
        fs.writeFileSync(configPath, configContent);
        
        console.log('\n✅ CONFIGURACIÓN COMPLETADA');
        console.log('\n📁 Archivos creados/actualizados:');
        console.log('   - .env');
        console.log('   - src/strategies/config.js');
        
        console.log('\n🚀 Para iniciar el bot:');
        console.log('   npm start');
        
        console.log('\n📊 Para ver el dashboard:');
        console.log('   http://localhost:3000');
        
        console.log('\n📱 API móvil disponible en:');
        console.log('   http://localhost:3001');
        
        if (mode === 'simulation') {
            console.log('\n⚠️  IMPORTANTE: El bot está en modo SIMULACIÓN');
            console.log('   No se ejecutarán trades reales');
            console.log('   Para trading real, cambiar BOT_MODE=live en .env');
        }
        
    } catch (error) {
        console.error('Error durante la configuración:', error);
    } finally {
        rl.close();
    }
}

function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

setupBot();