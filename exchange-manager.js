const ccxt = require("ccxt")

/**
 * Gestor de Exchanges para el Bot de Arbitraje
 */
class ExchangeManager {
  constructor(config) {
    this.config = config
    this.exchanges = {}
    this.logger = console
  }

  /**
   * 
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
        })

        await this.exchanges.binance.loadMarkets()
        this.logger.info("✅ Binance conectado")
      }

      // Configurar Bybit (NUEVO)
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

      // Configurar Kucoin (DESHABILITADO)
      if (this.config.EXCHANGES.KUCOIN.enabled) {
        this.exchanges.kucoin = new ccxt.kucoin({
          apiKey: this.config.EXCHANGES.KUCOIN.apiKey,
          secret: this.config.EXCHANGES.KUCOIN.apiSecret,
          password: this.config.EXCHANGES.KUCOIN.passphrase,
          sandbox: this.config.EXCHANGES.KUCOIN.sandbox,
          enableRateLimit: true,
          rateLimit: this.config.EXCHANGES.KUCOIN.rateLimit,
        })

        await this.exchanges.kucoin.loadMarkets()
        this.logger.info("✅ Kucoin conectado")
      }

      // Configurar Coinbase (si está habilitado)
      if (this.config.EXCHANGES.COINBASE.enabled) {
        this.exchanges.coinbase = new ccxt.coinbasepro({
          apiKey: this.config.EXCHANGES.COINBASE.apiKey,
          secret: this.config.EXCHANGES.COINBASE.apiSecret,
          password: this.config.EXCHANGES.COINBASE.passphrase,
          sandbox: this.config.EXCHANGES.COINBASE.sandbox,
          enableRateLimit: true,
          rateLimit: this.config.EXCHANGES.COINBASE.rateLimit,
        })

        await this.exchanges.coinbase.loadMarkets()
        this.logger.info("✅ Coinbase conectado")
      }

      // Configurar Kraken (si está habilitado)
      if (this.config.EXCHANGES.KRAKEN.enabled) {
        this.exchanges.kraken = new ccxt.kraken({
          apiKey: this.config.EXCHANGES.KRAKEN.apiKey,
          secret: this.config.EXCHANGES.KRAKEN.apiSecret,
          sandbox: this.config.EXCHANGES.KRAKEN.sandbox,
          enableRateLimit: true,
          rateLimit: this.config.EXCHANGES.KRAKEN.rateLimit,
        })

        await this.exchanges.kraken.loadMarkets()
        this.logger.info("✅ Kraken conectado")
      }

      this.logger.info("🎉 ExchangeManager inicializado correctamente")
      return true
    } catch (error) {
      this.logger.error("❌ Error inicializando ExchangeManager:", error.message)
      throw error
    }
  }

  /**
   * Obtiene un exchange por su nombre
   */
  getExchange(exchangeName) {
    return this.exchanges[exchangeName.toLowerCase()]
  }

  /**
   * Obtiene todos los exchanges
   */
  getAllExchanges() {
    return this.exchanges
  }

  /**
   * Obtiene los nombres de los exchanges habilitados
   */
  getEnabledExchangeNames() {
    return Object.keys(this.exchanges)
  }

  /**
   * Verifica si un exchange está habilitado
   */
  isExchangeEnabled(exchangeName) {
    return !!this.exchanges[exchangeName.toLowerCase()]
  }

  /**
   * Obtiene el balance de un exchange
   */
  async getBalance(exchangeName, symbol = null) {
    try {
      const exchange = this.getExchange(exchangeName)
      if (!exchange) {
        throw new Error(`Exchange ${exchangeName} no encontrado`)
      }

      const balance = await exchange.fetchBalance()
      if (symbol) {
        return balance[symbol] || { free: 0, used: 0, total: 0 }
      }
      return balance
    } catch (error) {
      this.logger.error(`❌ Error obteniendo balance de ${exchangeName}:`, error.message)
      throw error
    }
  }

  /**
   * Obtiene el ticker de un par en un exchange
   */
  async getTicker(exchangeName, symbol) {
    try {
      const exchange = this.getExchange(exchangeName)
      if (!exchange) {
        throw new Error(`Exchange ${exchangeName} no encontrado`)
      }

      return await exchange.fetchTicker(symbol)
    } catch (error) {
      this.logger.error(`❌ Error obteniendo ticker de ${symbol} en ${exchangeName}:`, error.message)
      throw error
    }
  }

  /**
   * Obtiene el libro de órdenes de un par en un exchange
   */
  async getOrderBook(exchangeName, symbol, limit = 5) {
    try {
      const exchange = this.getExchange(exchangeName)
      if (!exchange) {
        throw new Error(`Exchange ${exchangeName} no encontrado`)
      }

      return await exchange.fetchOrderBook(symbol, limit)
    } catch (error) {
      this.logger.error(`❌ Error obteniendo libro de órdenes de ${symbol} en ${exchangeName}:`, error.message)
      throw error
    }
  }

  /**
   * Ejecuta una orden de compra
   */
  async buy(exchangeName, symbol, amount, price = null, params = {}) {
    try {
      const exchange = this.getExchange(exchangeName)
      if (!exchange) {
        throw new Error(`Exchange ${exchangeName} no encontrado`)
      }

      // Orden de mercado si no se especifica precio
      const orderType = price ? "limit" : "market"

      return await exchange.createOrder(symbol, orderType, "buy", amount, price, params)
    } catch (error) {
      this.logger.error(`❌ Error ejecutando orden de compra de ${symbol} en ${exchangeName}:`, error.message)
      throw error
    }
  }

  /**
   * Ejecuta una orden de venta
   */
  async sell(exchangeName, symbol, amount, price = null, params = {}) {
    try {
      const exchange = this.getExchange(exchangeName)
      if (!exchange) {
        throw new Error(`Exchange ${exchangeName} no encontrado`)
      }

      // Orden de mercado si no se especifica precio
      const orderType = price ? "limit" : "market"

      return await exchange.createOrder(symbol, orderType, "sell", amount, price, params)
    } catch (error) {
      this.logger.error(`❌ Error ejecutando orden de venta de ${symbol} en ${exchangeName}:`, error.message)
      throw error
    }
  }

  /**
   * Verifica el estado de una orden
   */
  async checkOrder(exchangeName, orderId, symbol) {
    try {
      const exchange = this.getExchange(exchangeName)
      if (!exchange) {
        throw new Error(`Exchange ${exchangeName} no encontrado`)
      }

      return await exchange.fetchOrder(orderId, symbol)
    } catch (error) {
      this.logger.error(`❌ Error verificando orden ${orderId} en ${exchangeName}:`, error.message)
      throw error
    }
  }

  /**
   * Cancela una orden
   */
  async cancelOrder(exchangeName, orderId, symbol) {
    try {
      const exchange = this.getExchange(exchangeName)
      if (!exchange) {
        throw new Error(`Exchange ${exchangeName} no encontrado`)
      }

      return await exchange.cancelOrder(orderId, symbol)
    } catch (error) {
      this.logger.error(`❌ Error cancelando orden ${orderId} en ${exchangeName}:`, error.message)
      throw error
    }
  }

  /**
   * Cierra todas las conexiones
   */
  async close() {
    this.logger.info("🔄 Cerrando conexiones a exchanges...")
    // No hay un método específico para cerrar conexiones en ccxt
    // pero podemos limpiar el objeto exchanges
    this.exchanges = {}
    this.logger.info("✅ Conexiones cerradas")
  }

  // =========== AGREGADO PARA DASHBOARD PANEL DE COMISIONES ===========
  getFees() {
    // Devuelve las comisiones de cada exchange habilitado
    const fees = {}
    for (const [exName, exObj] of Object.entries(this.config.EXCHANGES)) {
      if (exObj.enabled && exObj.fees) {
        fees[exName] = exObj.fees
      }
    }
    return fees
  }
  // =========== FIN AGREGADO ===========
}

module.exports = ExchangeManager