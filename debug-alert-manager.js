require("dotenv").config()

console.log("=== DIAGNÓSTICO DEL ALERT MANAGER ===")

// Cargar configuración
const config = require("./src/strategies/config")

console.log("Configuración de alertas:")
console.log("ALERTS.ENABLED:", config.ALERTS.ENABLED)
console.log("EMAIL.enabled:", config.ALERTS.CHANNELS.EMAIL.enabled)
console.log("TELEGRAM.enabled:", config.ALERTS.CHANNELS.TELEGRAM.enabled)

console.log("\nConfiguración de BOT_STARTED:")
console.log("BOT_STARTED:", config.ALERTS.ALERT_TYPES.BOT_STARTED)

// Probar AlertManager
async function testAlertManager() {
  try {
    console.log("\n=== INICIALIZANDO ALERT MANAGER ===")

    const AlertManager = require("./src/alerts/alert-manager")
    const alertManager = new AlertManager(config)

    console.log("AlertManager creado")

    await alertManager.initialize()
    console.log("AlertManager inicializado")

    console.log("\n=== ENVIANDO ALERTA DE PRUEBA ===")

    // Enviar alerta que debería ir tanto a Telegram como Email
    await alertManager.sendAlert("BOT_STARTED", "🤖 Test manual - Bot iniciado")

    console.log("✅ Alerta enviada")

    // Esperar un poco para que se procese
    setTimeout(() => {
      console.log("\n=== ENVIANDO ALERTA DE ERROR (DEBE IR A EMAIL) ===")
      alertManager.sendAlert("ERROR", "❌ Test de error - Debe llegar a email y telegram")

      setTimeout(() => {
        console.log("✅ Proceso completado")
        process.exit(0)
      }, 3000)
    }, 2000)
  } catch (error) {
    console.error("❌ Error:", error)
  }
}

testAlertManager()
