// ========== GESTOR DE DATOS HISTÓRICOS PARA BACKTESTING ==========
const fs = require("fs").promises
const path = require("path")
const config = require("../config") // Ajusta la ruta según tu estructura
const { ExchangeManager } = require("../exchanges") // Ajusta la ruta

class HistoricalDataManager {
  constructor(exchangeManager) {
    this.dataDir = config.BACKTESTING.HISTORICAL_DATA_PATH || "./historical_data"
    this.exchangeManager = exchangeManager || new ExchangeManager() // Puede pasarse o crearse uno nuevo
    this.ensureDataDirExists()
  }

  async ensureDataDirExists() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true })
      console.log(`Directorio de datos históricos asegurado: ${this.dataDir}`)
    } catch (error) {
      console.error(`Error creando directorio de datos históricos ${this.dataDir}:`, error)
    }
  }

  getFilePath(exchange, pair, date) {
    // Formato de fecha YYYY-MM-DD
    const dateString = date.toISOString().split("T")[0]
    const pairFilename = pair.replace("/", "_") // BTC/USDT -> BTC_USDT
    return path.join(this.dataDir, exchange, pairFilename, `${dateString}.json`)
  }

  async saveData(exchange, pair, date, data) {
    const filePath = this.getFilePath(exchange, pair, date)
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true })
      await fs.writeFile(filePath, JSON.stringify(data, null, 2))
      console.log(`Datos guardados para ${exchange} - ${pair} en ${filePath}`)
    } catch (error) {
      console.error(`Error guardando datos en ${filePath}:`, error)
    }
  }

  async loadData(exchange, pair, date) {
    const filePath = this.getFilePath(exchange, pair, date)
    try {
      const data = await fs.readFile(filePath, "utf-8")
      return JSON.parse(data)
    } catch (error) {
      if (error.code === "ENOENT") {
        // console.log(`No se encontraron datos para ${exchange} - ${pair} en ${filePath}`);
        return null
      }
      console.error(`Error cargando datos desde ${filePath}:`, error)
      return null
    }
  }

  // Ejemplo: Obtener datos de Klines (velas)
  // Binance API: /api/v3/klines
  // KuCoin API: /api/v1/market/candles
  async fetchAndStoreCandlestickData(exchange, pair, interval = "1m", startTime, endTime) {
    // Esta función necesitaría implementaciones específicas por exchange
    // y manejar paginación si es necesario.
    console.log(
      `Simulando obtención de datos de velas para ${exchange} - ${pair} de ${new Date(startTime)} a ${new Date(endTime)}`,
    )

    // Ejemplo simplificado: generar datos aleatorios para un día
    const date = new Date(startTime)
    const existingData = await this.loadData(exchange, pair, date)
    if (existingData) {
      console.log(`Datos para ${exchange} - ${pair} en ${date.toISOString().split("T")[0]} ya existen.`)
      return existingData
    }

    const mockCandles = []
    let currentTime = startTime
    while (currentTime < endTime) {
      const open = Math.random() * 100 + 1000 // Precio de apertura aleatorio
      const close = open + (Math.random() - 0.5) * 10
      const high = Math.max(open, close) + Math.random() * 5
      const low = Math.min(open, close) - Math.random() * 5
      const volume = Math.random() * 1000

      mockCandles.push([
        currentTime, // Open time
        open.toFixed(4), // Open
        high.toFixed(4), // High
        low.toFixed(4), // Low
        close.toFixed(4), // Close
        volume.toFixed(4), // Volume
        currentTime + (60000 - 1), // Close time (para intervalo de 1m)
        (volume * ((open + close) / 2)).toFixed(4), // Quote asset volume
        Math.floor(Math.random() * 100), // Number of trades
        (volume / 2).toFixed(4), // Taker buy base asset volume
        ((volume * ((open + close) / 2)) / 2).toFixed(4), // Taker buy quote asset volume
        "0", // Ignore
      ])
      currentTime += 60000 // Avanzar 1 minuto
    }

    await this.saveData(exchange, pair, date, mockCandles)
    return mockCandles
  }

  async getHistoricalRange(exchange, pair, startDate, endDate, interval = "1m") {
    let allData = []
    const currentDate = new Date(startDate)
    const finalDate = new Date(endDate)

    while (currentDate <= finalDate) {
      let dailyData = await this.loadData(exchange, pair, currentDate)
      if (!dailyData) {
        // Si no hay datos locales, intentar obtenerlos (si se implementa la lógica de fetch real)
        // Por ahora, para el ejemplo, podríamos simular o simplemente saltar.
        console.log(
          `No hay datos locales para ${exchange} - ${pair} en ${currentDate.toISOString().split("T")[0]}, intentando obtener...`,
        )
        dailyData = await this.fetchAndStoreCandlestickData(
          exchange,
          pair,
          interval,
          currentDate.getTime(),
          currentDate.getTime() + (24 * 60 * 60 * 1000 - 1),
        )
      }
      if (dailyData) {
        allData = allData.concat(dailyData)
      }
      currentDate.setDate(currentDate.getDate() + 1) // Siguiente día
    }
    return allData
  }
}

module.exports = { HistoricalDataManager }
