// Este script prueba la conexión a Telegram directamente
require("dotenv").config() // Cargar variables de entorno desde .env

const axios = require("axios")

// Obtener las variables de entorno
const botToken = process.env.TELEGRAM_BOT_TOKEN
const chatId = process.env.TELEGRAM_CHAT_ID

console.log("=== TEST DE CONEXIÓN A TELEGRAM ===")
console.log("TELEGRAM_BOT_TOKEN:", botToken ? "CONFIGURADO" : "NO CONFIGURADO")
console.log("TELEGRAM_CHAT_ID:", chatId ? "CONFIGURADO" : "NO CONFIGURADO")

if (!botToken || !chatId) {
  console.error("ERROR: Variables de entorno no configuradas correctamente")
  console.error("Por favor, crea un archivo .env con TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID")
  process.exit(1)
}

// Función para enviar un mensaje de prueba
async function sendTestMessage() {
  try {
    console.log("Enviando mensaje de prueba a Telegram...")

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    const message = `🤖 Test de conexión: ${new Date().toLocaleString()}`

    const response = await axios.post(url, {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
    })

    if (response.data.ok) {
      console.log("✅ ÉXITO: Mensaje enviado correctamente a Telegram")
      console.log("Detalles:", response.data.result)
    } else {
      console.error("❌ ERROR: La API de Telegram respondió con un error")
      console.error("Respuesta:", response.data)
    }
  } catch (error) {
    console.error("❌ ERROR al enviar mensaje a Telegram:")

    if (error.response) {
      // Error de la API de Telegram
      console.error("Código de estado:", error.response.status)
      console.error("Respuesta:", error.response.data)
    } else if (error.request) {
      // Error de red
      console.error("Error de red - No se pudo conectar a la API de Telegram")
    } else {
      // Otro tipo de error
      console.error("Error:", error.message)
    }
  }
}

// Ejecutar la prueba
sendTestMessage()
