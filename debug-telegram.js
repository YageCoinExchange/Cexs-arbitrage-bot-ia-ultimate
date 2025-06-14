require("dotenv").config()

console.log("=== DIAGNÓSTICO DE TELEGRAM ===")
console.log("Variables de entorno:")
console.log("TELEGRAM_BOT_TOKEN:", process.env.TELEGRAM_BOT_TOKEN ? "✅ CONFIGURADO" : "❌ NO CONFIGURADO")
console.log("TELEGRAM_CHAT_ID:", process.env.TELEGRAM_CHAT_ID ? "✅ CONFIGURADO" : "❌ NO CONFIGURADO")

if (process.env.TELEGRAM_BOT_TOKEN) {
  console.log("Token (primeros 10 caracteres):", process.env.TELEGRAM_BOT_TOKEN.substring(0, 10) + "...")
}

if (process.env.TELEGRAM_CHAT_ID) {
  console.log("Chat ID:", process.env.TELEGRAM_CHAT_ID)
}

// Probar la configuración del bot
const config = require("./src/strategies/config")
console.log("\n=== CONFIGURACIÓN DEL BOT ===")
console.log("Alertas habilitadas:", config.ALERTS.ENABLED)
console.log("Telegram habilitado:", config.ALERTS.CHANNELS.TELEGRAM.enabled)
console.log("Bot Token en config:", config.ALERTS.CHANNELS.TELEGRAM.botToken ? "✅ CONFIGURADO" : "❌ NO CONFIGURADO")
console.log("Chat ID en config:", config.ALERTS.CHANNELS.TELEGRAM.chatId ? "✅ CONFIGURADO" : "❌ NO CONFIGURADO")

// Probar envío directo
async function testDirectTelegram() {
  const https = require("https")

  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    console.log("\n❌ No se puede probar: faltan credenciales")
    return
  }

  console.log("\n=== PROBANDO ENVÍO DIRECTO ===")

  const message = `🔧 Test directo: ${new Date().toLocaleString()}`

  const data = JSON.stringify({
    chat_id: chatId,
    text: message,
    parse_mode: "HTML",
  })

  const options = {
    hostname: "api.telegram.org",
    port: 443,
    path: `/bot${botToken}/sendMessage`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
    },
  }

  const req = https.request(options, (res) => {
    let responseData = ""

    res.on("data", (chunk) => {
      responseData += chunk
    })

    res.on("end", () => {
      try {
        const response = JSON.parse(responseData)
        if (response.ok) {
          console.log("✅ ÉXITO: Mensaje enviado a Telegram")
          console.log("Detalles:", response.result)
        } else {
          console.log("❌ ERROR de Telegram:", response.description)
        }
      } catch (error) {
        console.log("❌ Error parseando respuesta:", error.message)
        console.log("Respuesta cruda:", responseData)
      }
    })
  })

  req.on("error", (error) => {
    console.log("❌ Error de conexión:", error.message)
  })

  req.write(data)
  req.end()
}

// Ejecutar prueba
testDirectTelegram()

// Probar AlertManager
setTimeout(async () => {
  console.log("\n=== PROBANDO ALERT MANAGER ===")
  try {
    const AlertManager = require("./src/alerts/alert-manager")
    const alertManager = new AlertManager(config)

    await alertManager.initialize()
    await alertManager.sendAlert("info", "🧪 Test desde AlertManager")

    console.log("✅ AlertManager ejecutado sin errores")
  } catch (error) {
    console.log("❌ Error en AlertManager:", error.message)
  }
}, 2000)
