// Nuevo script para ejecutar el backtesting
const { Backtester } = require("../backtesting/backtester")
const { HistoricalDataManager } = require("../backtesting/historical-data-manager")
const config = require("../config")

async function main() {
  if (!config.BACKTESTING.ENABLED) {
    console.log("El backtesting está desactivado en la configuración.")
    return
  }

  const startDateStr = process.argv[2] || "2024-01-01" // Ejemplo: YYYY-MM-DD
  const endDateStr = process.argv[3] || "2024-01-02" // Ejemplo: YYYY-MM-DD

  console.log(`Preparando datos históricos para el backtest (${startDateStr} a ${endDateStr})...`)
  const dataManager = new HistoricalDataManager()

  // Descargar/verificar datos para el rango especificado
  // Esto es un ejemplo, necesitarías una lógica más robusta para manejar los días
  const currentDate = new Date(startDateStr)
  const finalDate = new Date(endDateStr)

  while (currentDate <= finalDate) {
    for (const pairConfig of config.TRADING_PAIRS) {
      for (const exchangeName of Object.keys(config.EXCHANGES)) {
        // El método fetchAndStoreCandlestickData ahora guarda los datos si no existen.
        // Para un backtest, primero nos aseguraríamos que los datos existen.
        // Si no, se podrían descargar aquí o el backtester podría hacerlo.
        // Por simplicidad, asumimos que fetchAndStore los obtiene y guarda si es necesario.
        await dataManager.fetchAndStoreCandlestickData(
          exchangeName,
          pairConfig.symbol,
          "1m", // intervalo
          currentDate.getTime(), // startTime del día
          currentDate.getTime() + (24 * 60 * 60 * 1000 - 1), // endTime del día
        )
      }
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }
  console.log("Datos históricos listos.")

  const backtester = new Backtester(startDateStr, endDateStr)

  try {
    const report = await backtester.run()
    console.log("\n--- Reporte Final del Backtest ---")
    console.log(`Periodo: ${report.startDate.toDateString()} - ${report.endDate.toDateString()}`)
    console.log(`Balance Inicial: ${report.initialBalance.toFixed(2)} USDT`)
    console.log(`Balance Final: ${report.finalBalance.toFixed(2)} USDT`)
    console.log(`Profit: ${report.profit.toFixed(2)} USDT (${report.profitPercentage.toFixed(2)}%)`)
    console.log(`Total Trades: ${report.totalTrades}`)

    // Enviar alerta con el resumen del backtest
    if (config.ALERTS.ALERT_ON_BACKTEST_COMPLETION && backtester.simulatedBot) {
      const alertMessage =
        `Backtest completado (${startDateStr} a ${endDateStr}):\n` +
        `Profit: ${report.profit.toFixed(2)} USDT (${report.profitPercentage.toFixed(2)}%)\n` +
        `Trades: ${report.totalTrades}`
      await backtester.simulatedBot.logAndAlert(alertMessage, { type: "BACKTEST_RESULT", priority: "normal" })
    }
  } catch (error) {
    console.error("Error durante el backtesting:", error)
  }
}

main()
