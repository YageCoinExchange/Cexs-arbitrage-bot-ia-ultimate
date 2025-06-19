const EventEmitter = require("events")
const ExchangeManager = require("./src/exchanges/exchange-manager")
const AlertManager = require("./src/alerts/alert-manager")

/**
 * Bot de Arbitraje para Exchanges CEX
 */
class ArbitrageBot extends EventEmitter {
  constructor(config) {
    super()
    this.config = config
    this.isRunning = false
    this.mode = "simulation" // "simulation" o "production"
    this.strategy = "basic"
    this.riskLevel = config.RISK_MANAGEMENT.RISK_LEVEL
    this.tradingPairs = config.TRADING_PAIRS
    this.checkInterval = config.CHECK_INTERVAL
    this.totalProfit = 0
    this.totalTrades = 0
    this.successfulTrades = 0
    this.failedTrades = 0
    this.lastOpportunities = {}
    this.checkIntervalId = null
    this.logger = console

    // Inicializar gestores
    this.exchangeManager = new ExchangeManager(config)
    this.alertManager = new AlertManager(config)

    // ====== AGREGADO PARA DASHBOARD ======
    this.simulation = true
  }

  /**
   * Inicia el bot
   */
  async start(mode = "simulation") {
    try {
      if (this.isRunning) {
        this.logger.warn("⚠️ El bot ya está en ejecución")
        return
      }

      this.mode = mode
      this.simulation = mode === "simulation"
      this.logger.info(`🚀 Iniciando bot en modo: ${this.mode}`)

      // Inicializar componentes
      await this.initialize()

      // Enviar alerta de inicio
      await this.alertManager.sendAlert(
        "BOT_STARTED",
        `🤖 Bot de Arbitraje iniciado en modo ${this.mode.toUpperCase()}`,
      )

      // Iniciar verificación periódica
      this.startPeriodicCheck()

      this.isRunning = true
      this.emit("started", { mode: this.mode })

      return true
    } catch (error) {
      this.logger.error("❌ Error al iniciar bot:", error.message)

      // Enviar alerta de error
      await this.alertManager.sendAlert("ERROR", `Error al iniciar bot: ${error.message}`)

      throw error
    }
  }

  /**
   * Detiene el bot
   */
  async stop() {
    try {
      if (!this.isRunning) {
        this.logger.warn("⚠️ El bot no está en ejecución")
        return
      }

      this.logger.info("🛑 Deteniendo bot...")

      // Detener verificación periódica
      this.stopPeriodicCheck()

      // Enviar alerta de detención
      await this.alertManager.sendAlert("BOT_STOPPED", "🛑 Bot de Arbitraje detenido")

      this.isRunning = false
      this.emit("stopped")

      return true
    } catch (error) {
      this.logger.error("❌ Error al detener bot:", error.message)
      throw error
    }
  }

  /**
   * Cambia la estrategia del bot
   */
  changeStrategy(strategy) {
    if (!this.config.STRATEGIES[strategy.toUpperCase()]) {
      throw new Error(`Estrategia ${strategy} no válida`)
    }

    this.strategy = strategy
    this.logger.info(`🔄 Estrategia cambiada a: ${strategy}`)
    this.emit("strategyChanged", { strategy })

    return true
  }

  /**
   * Actualiza la configuración de riesgo
   */
  updateRiskSettings(settings) {
    if (settings.riskLevel) {
      this.riskLevel = settings.riskLevel
      this.logger.info(`🔄 Nivel de riesgo cambiado a: ${settings.riskLevel}`)
    }

    this.emit("riskSettingsUpdated", settings)
    return true
  }

  /**
   * Inicializa los componentes del bot
   */
  async initialize() {
    try {
      // Inicializar AlertManager
      await this.alertManager.initialize()

      // Inicializar ExchangeManager
      await this.exchangeManager.initialize()

      return true
    } catch (error) {
      this.logger.error("❌ Error inicializando componentes:", error.message)
      throw error
    }
  }

  /**
   * Inicia la verificación periódica de oportunidades
   */
  startPeriodicCheck() {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId)
    }

    this.checkIntervalId = setInterval(() => {
      this.checkOpportunities().catch((error) => {
        this.logger.error("❌ Error en verificación periódica:", error.message)
      })
    }, this.checkInterval)

    this.logger.info(`🔄 Verificación periódica iniciada (cada ${this.checkInterval}ms)`)
  }

  /**
   * Detiene la verificación periódica
   */
  stopPeriodicCheck() {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId)
      this.checkIntervalId = null
      this.logger.info("🛑 Verificación periódica detenida")
    }
  }

  /**
   * Verifica oportunidades de arbitraje
   */
  async checkOpportunities() {
    try {
      this.logger.debug("🔍 Verificando oportunidades de arbitraje...")

      // Obtener precios de todos los pares
      const prices = await this.fetchPrices()

      // Calcular oportunidades
      const opportunities = this.calculateArbitrageOpportunities(prices)

      // Actualizar últimas oportunidades
      this.lastOpportunities = opportunities

      // Verificar si hay oportunidades viables
      const viableOpportunities = this.filterViableOpportunities(opportunities)

      if (viableOpportunities.length > 0) {
        this.logger.info(`🎯 Encontradas ${viableOpportunities.length} oportunidades viables`)

        // Enviar alerta para cada oportunidad
        for (const opportunity of viableOpportunities) {
          await this.alertManager.sendAlert(
            "OPPORTUNITY_FOUND",
            `🎯 Oportunidad: ${opportunity.pair}\n💰 Ganancia: ${opportunity.profitPercentage.toFixed(2)}%\n📈 Comprar en: ${opportunity.buyExchange}\n📉 Vender en: ${opportunity.sellExchange}`,
          )
        }

        // Ejecutar arbitraje si está en modo producción y está configurado para auto-ejecutar
        if (this.mode === "production" && this.config.STRATEGIES[this.strategy.toUpperCase()].autoExecute) {
          for (const opportunity of viableOpportunities) {
            await this.executeArbitrage(opportunity)
          }
        }
      }

      return opportunities
    } catch (error) {
      this.logger.error("❌ Error verificando oportunidades:", error.message)
      throw error
    }
  }

  /**
   * Obtiene precios de todos los exchanges
   */
  async fetchPrices() {
    const prices = {}

    for (const pair of this.tradingPairs) {
      prices[pair] = {}

      for (const exchangeName of this.exchangeManager.getEnabledExchangeNames()) {
        try {
          const ticker = await this.exchangeManager.getTicker(exchangeName, pair)

          prices[pair][exchangeName] = {
            bid: ticker.bid,
            ask: ticker.ask,
            last: ticker.last,
            volume: ticker.baseVolume,
            timestamp: ticker.timestamp,
          }
        } catch (error) {
          this.logger.warn(`⚠️ Error obteniendo precio de ${pair} en ${exchangeName}: ${error.message}`)
        }
      }
    }

    return prices
  }

  /**
   * Calcula oportunidades de arbitraje
   */
  calculateArbitrageOpportunities(prices) {
    const opportunities = []

    for (const [pair, exchangePrices] of Object.entries(prices)) {
      const exchanges = Object.keys(exchangePrices)

      if (exchanges.length < 2) {
        continue
      }

      // Encontrar mejor compra (menor ask) y mejor venta (mayor bid)
      let bestBuy = { exchange: null, price: Number.POSITIVE_INFINITY }
      let bestSell = { exchange: null, price: 0 }

      for (const [exchange, priceData] of Object.entries(exchangePrices)) {
        if (priceData.ask && priceData.ask < bestBuy.price) {
          bestBuy = { exchange, price: priceData.ask }
        }

        if (priceData.bid && priceData.bid > bestSell.price) {
          bestSell = { exchange, price: priceData.bid }
        }
      }

      // Verificar si hay oportunidad
      if (bestBuy.exchange && bestSell.exchange && bestBuy.exchange !== bestSell.exchange) {
        const profitPercentage = ((bestSell.price - bestBuy.price) / bestBuy.price) * 100
        const fees = this.calculateFees(bestBuy.exchange, bestSell.exchange, bestBuy.price, bestSell.price)
        const netProfitPercentage = profitPercentage - fees.totalFeePercentage

        opportunities.push({
          pair,
          buyExchange: bestBuy.exchange,
          sellExchange: bestSell.exchange,
          buyPrice: bestBuy.price,
          sellPrice: bestSell.price,
          profitPercentage,
          fees,
          netProfitPercentage,
          timestamp: Date.now(),
        })
      }
    }

    return opportunities
  }

  /**
   * Filtra oportunidades viables según la estrategia actual
   */
  filterViableOpportunities(opportunities) {
    const strategy = this.config.STRATEGIES[this.strategy.toUpperCase()]
    const minProfitPercentage = strategy.minProfitPercentage

    return opportunities.filter((opportunity) => {
      // Verificar si la ganancia neta supera el mínimo
      return opportunity.netProfitPercentage >= minProfitPercentage
    })
  }

  /**
   * Calcula las comisiones para una operación de arbitraje
   */
  calculateFees(buyExchange, sellExchange, buyPrice, sellPrice) {
    const buyFeeRate = this.config.EXCHANGES[buyExchange.toUpperCase()]?.fees?.taker || 0.001
    const sellFeeRate = this.config.EXCHANGES[sellExchange.toUpperCase()]?.fees?.taker || 0.001

    const buyFee = buyPrice * buyFeeRate
    const sellFee = sellPrice * sellFeeRate
    const totalFee = buyFee + sellFee
    const totalFeePercentage = (buyFeeRate + sellFeeRate) * 100

    return {
      buyFee,
      sellFee,
      totalFee,
      totalFeePercentage,
      buyFeeRate,
      sellFeeRate,
    }
  }

  /**
   * Ejecuta una operación de arbitraje
   */
  async executeArbitrage(opportunity) {
    try {
      this.logger.info(`🚀 Ejecutando arbitraje: ${opportunity.pair}`)

      // Calcular cantidad a comprar según la configuración
      const strategy = this.config.STRATEGIES[this.strategy.toUpperCase()]
      const maxInvestmentPercentage = strategy.maxInvestmentPercentage

      // Obtener balance disponible
      const balance = await this.exchangeManager.getBalance(opportunity.buyExchange, "USDT")
      const availableBalance = balance.free

      // Calcular cantidad a invertir
      const investmentAmount = availableBalance * maxInvestmentPercentage
      const buyAmount = investmentAmount / opportunity.buyPrice

      // Ejecutar compra
      let buyOrder
      if (this.mode === "production") {
        buyOrder = await this.exchangeManager.buy(opportunity.buyExchange, opportunity.pair, buyAmount)
      } else {
        // Simular compra
        buyOrder = {
          id: `sim_${Date.now()}`,
          amount: buyAmount,
          price: opportunity.buyPrice,
          cost: buyAmount * opportunity.buyPrice,
          status: "closed",
        }
      }

      // Antes de arbitrar...
async function checkOpportunity(pair, amount) {
  // 1. Revisa volumen del par (¡clave para que no muevas el precio!)
  const volume = await getPairVolume(pair);
  if (volume < amount * 10) return false; // Ejemplo: solo arbitra si hay 10x más volumen que tu operación

  // 2. Calcula fees por token y exchange (usa FEES_AND_LIMITS[exchange][token])
  const binanceFees = config.FEES_AND_LIMITS.BINANCE[pair.split('/')[0]];
  const bybitFees = config.FEES_AND_LIMITS.BYBIT[pair.split('/')[0]];
  // Aplica la lógica específica por token/fee

  // 3. Calcula si el spread - fees - slippage te deja ganancia neta positiva
  // Si no, ignora la oportunidad

  // 4. Si la red/token está suspendido o en mantenimiento (revisa cada 12h llamando a la API del exchange)
  //   - Si está suspendida, ignora el par y márcalo como inactivo
  //   - Puedes guardar un timestamp y solo volver a intentarlo después de 12h

  // 5. Si todo está OK, agrega la oportunidad a la lista de oportunidades y ejecuta
}

      this.logger.info(`✅ Compra ejecutada en ${opportunity.buyExchange}: ${buyAmount} a $${opportunity.buyPrice}`)

      // Ejecutar venta
      let sellOrder
      if (this.mode === "production") {
        sellOrder = await this.exchangeManager.sell(opportunity.sellExchange, opportunity.pair, buyAmount)
      } else {
        // Simular venta
        sellOrder = {
          id: `sim_${Date.now() + 1}`,
          amount: buyAmount,
          price: opportunity.sellPrice,
          cost: buyAmount * opportunity.sellPrice,
          status: "closed",
        }
      }

      this.logger.info(`✅ Venta ejecutada en ${opportunity.sellExchange}: ${buyAmount} a $${opportunity.sellPrice}`)

      // Calcular ganancia
      const profit = (sellOrder.price - buyOrder.price) * buyAmount
      this.totalProfit += profit
      this.totalTrades++
      this.successfulTrades++

      // Enviar alerta de operación exitosa
      await this.alertManager.sendAlert(
        "TRADE_EXECUTED",
        `💰 Arbitraje ejecutado: ${opportunity.pair}\n📈 Compra: ${buyAmount} a $${opportunity.buyPrice} en ${opportunity.buyExchange}\n📉 Venta: ${buyAmount} a $${opportunity.sellPrice} en ${opportunity.sellExchange}\n💵 Ganancia: $${profit.toFixed(2)}`,
      )

      this.emit("arbitrageExecuted", {
        opportunity,
        buyOrder,
        sellOrder,
        profit,
      })

      return {
        success: true,
        profit,
        buyOrder,
        sellOrder,
      }
    } catch (error) {
      this.logger.error(`❌ Error ejecutando arbitraje: ${error.message}`)

      this.totalTrades++
      this.failedTrades++

      // Enviar alerta de error
      await this.alertManager.sendAlert(
        "TRADE_FAILED",
        `❌ Error en arbitraje: ${opportunity.pair}\n💰 Ganancia esperada: ${opportunity.netProfitPercentage.toFixed(2)}%\n⚠️ Error: ${error.message}`,
      )

      this.emit("arbitrageFailed", {
        opportunity,
        error: error.message,
      })

      throw error
    }
  }

  /**
   * Obtiene el estado actual del bot
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      mode: this.mode,
      strategy: this.strategy,
      riskLevel: this.riskLevel,
      totalProfit: this.totalProfit,
      totalTrades: this.totalTrades,
      successfulTrades: this.successfulTrades,
      failedTrades: this.failedTrades,
      tradingPairs: this.tradingPairs,
      checkInterval: this.checkInterval,
      lastCheck: Date.now(),
      // ====== AGREGADO PARA DASHBOARD ======
      simulation: this.simulation
    }
  }

  // ====== AGREGADO PARA DASHBOARD Y API ======
  setSimulationMode(sim) {
    this.simulation = !!sim
    this.mode = this.simulation ? "simulation" : "production"
  }
  isSimulation() {
    return this.simulation
  }
  getLiveOpportunities() {
    // Devuelve las últimas oportunidades encontradas
    if (Array.isArray(this.lastOpportunities)) {
      return this.lastOpportunities
    }
    // Si está en formato objeto, convertir a array
    return Object.values(this.lastOpportunities)
  }
  isRunningBot() {
    return this.isRunning
  }
}

module.exports = ArbitrageBot;