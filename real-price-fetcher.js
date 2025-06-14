const ccxt = require("ccxt")

/**
 * Fetcher de precios reales para Binance y Bybit
 */
class RealPriceFetcher {
  constructor(config) {
    this.config = config
    this.exchanges = {}
    this.lastPrices = {}
    this.isInitialized = false

    this.logger = console
  }

  /**
   * Inicializa las conexiones a los exchanges
   */
  async initialize() {
    try {
      this.logger.info("🔄 Inicializando conexiones a exchanges...")

      // Configurar Binance
if (this.config.EXCHANGES.BINANCE.enabled) {
   this.exchanges.binance = new ccxt.binance({
    apiKey: this.config.EXCHANGES.BINANCE.apiKey,
    secret: this.config.EXCHANGES.BINANCE.apiSecret,
    sandbox: this.config.EXCHANGES.BINANCE.sandbox,
    enableRateLimit: true,
    rateLimit: this.config.EXCHANGES.BINANCE.rateLimit,
  });

  await this.exchanges.binance.loadMarkets();
  this.logger.info("✅ Binance conectado");
}

      // Configurar Bybit (NUEVO - reemplaza Kucoin)
      if (this.config.EXCHANGES.BYBIT.enabled) {
        this.exchanges.bybit = new ccxt.bybit({
          apiKey: this.config.EXCHANGES.BYBIT.apiKey,
          secret: this.config.EXCHANGES.BYBIT.apiSecret,
          sandbox: this.config.EXCHANGES.BYBIT.sandbox,
          enableRateLimit: true,
          rateLimit: this.config.EXCHANGES.BYBIT.rateLimit,
        })

        await this.exchanges.bybit.loadMarkets()
        this.logger.info("✅ Bybit conectado")
      }

      this.isInitialized = true
      this.logger.info("🎉 RealPriceFetcher inicializado correctamente")
    } catch (error) {
      this.logger.error("❌ Error inicializando RealPriceFetcher:", error.message)
      throw error
    }
  }

  /**
   * Obtiene precios reales de todos los exchanges para un par específico
   */
  async fetchPricesForPair(pair) {
    if (!this.isInitialized) {
      throw new Error("RealPriceFetcher no está inicializado")
    }

    const prices = {}

    for (const [exchangeName, exchange] of Object.entries(this.exchanges)) {
      try {
        // Verificar si el par está disponible
        if (!exchange.markets[pair]) {
          this.logger.warn(`⚠️  Par ${pair} no disponible en ${exchangeName}`)
          continue
        }

        // Obtener ticker
        const ticker = await exchange.fetchTicker(pair)

        prices[exchangeName] = {
          price: ticker.last,
          bid: ticker.bid,
          ask: ticker.ask,
          volume: ticker.baseVolume,
          timestamp: ticker.timestamp,
          lastUpdate: Date.now(),
        }

        this.logger.debug(`📊 ${exchangeName}: ${pair} = $${ticker.last?.toFixed(4)}`)
      } catch (error) {
        this.logger.error(`❌ Error obteniendo precio de ${pair} en ${exchangeName}:`, error.message)
      }
    }

    // Guardar en caché
    this.lastPrices[pair] = prices

    return prices
  }

  /**
   * Obtiene precios de todos los pares configurados
   */
  async fetchAllPrices() {
    const allPrices = {}

    for (const pair of this.config.TRADING_PAIRS) {
      try {
        allPrices[pair] = await this.fetchPricesForPair(pair)

        // Pequeña pausa para evitar rate limits
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error) {
        this.logger.error(`❌ Error obteniendo precios para ${pair}:`, error.message)
      }
    }

    return allPrices
  }

  /**
   * Calcula oportunidades de arbitraje
   */
  calculateArbitrageOpportunities(prices) {
    const opportunities = {}

    for (const [pair, exchangePrices] of Object.entries(prices)) {
      const exchanges = Object.keys(exchangePrices)

      if (exchanges.length < 2) {
        continue
      }

      let bestBuy = null
      let bestSell = null
      let lowestAsk = Number.POSITIVE_INFINITY
      let highestBid = 0

      // Encontrar mejor compra (menor ask) y mejor venta (mayor bid)
      for (const [exchangeName, priceData] of Object.entries(exchangePrices)) {
        if (priceData.ask && priceData.ask < lowestAsk) {
          lowestAsk = priceData.ask
          bestBuy = { exchange: exchangeName, price: priceData.ask }
        }

        if (priceData.bid && priceData.bid > highestBid) {
          highestBid = priceData.bid
          bestSell = { exchange: exchangeName, price: priceData.bid }
        }
      }

      if (bestBuy && bestSell && bestBuy.exchange !== bestSell.exchange) {
        const profitPercentage = ((bestSell.price - bestBuy.price) / bestBuy.price) * 100

        opportunities[pair] = {
          exchanges: exchangePrices,
          bestBuy,
          bestSell,
          profitPercentage,
          isOpportunity: profitPercentage >= this.config.STRATEGIES.BASIC.minProfitPercentage,
          minProfitThreshold: this.config.STRATEGIES.BASIC.minProfitPercentage,
        }
      }
    }

    return opportunities
  }

  /**
   * Obtiene los últimos precios del caché
   */
  getLastPrices() {
    return this.lastPrices
  }

  /**
   * Verifica el estado de las conexiones
   */
  async checkConnections() {
    const status = {}

    for (const [exchangeName, exchange] of Object.entries(this.exchanges)) {
      try {
        const exchangeStatus = await exchange.fetchStatus()
        status[exchangeName] = {
          connected: true,
          status: exchangeStatus.status || "active",
          updated: exchangeStatus.updated,
        }
      } catch (error) {
        status[exchangeName] = {
          connected: false,
          error: error.message,
        }
      }
    }

    return status
  }
}

module.exports = RealPriceFetcher
