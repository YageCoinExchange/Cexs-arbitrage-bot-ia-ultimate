// ========== MÓDULO DE GESTIÓN DE EXCHANGES ==========
const axios = require("axios")
const crypto = require("crypto")
const EventEmitter = require('events')
const config = require('../strategies/config');

class ExchangeManager extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.exchanges = {
      BINANCE: {
        name: "Binance",
        baseURL: config.EXCHANGES.BINANCE.testnet || config.EXCHANGES.BINANCE.baseURL,
        apiKey: config.EXCHANGES.BINANCE.apiKey,
        apiSecret: config.EXCHANGES.BINANCE.apiSecret,
      },
      KUCOIN: {
        name: "KuCoin",
        baseURL: config.EXCHANGES.KUCOIN.testnet || config.EXCHANGES.KUCOIN.baseURL,
        apiKey: config.EXCHANGES.KUCOIN.apiKey,
        apiSecret: config.EXCHANGES.KUCOIN.apiSecret,
        passphrase: config.EXCHANGES.KUCOIN.passphrase,
      },
    }

    console.log(`🔄 Exchange Manager inicializado: ${Object.keys(this.exchanges).join(", ")}`)
    console.log(`🧪 Modo testnet: ${config.TRADING_MODE === 'simulation' ? "Activado" : "Desactivado"}`)
  }

  // Obtener precios de todos los pares en todos los exchanges
  async getAllPrices() {
    const allPrices = {}

    for (const pair of config.TRADING_PAIRS) {
      allPrices[pair.symbol] = {}

      for (const exchangeName of Object.keys(this.exchanges)) {
        try {
          const price = await this.getPrice(exchangeName, pair.symbol)
          allPrices[pair.symbol][exchangeName] = price
        } catch (error) {
          console.error(`Error obteniendo precio de ${pair.symbol} en ${exchangeName}:`, error.message)
        }
      }
    }

    return allPrices
  }

  // Obtener precio de un par en un exchange específico
  async getPrice(exchangeName, symbol) {
    if (exchangeName === "BINANCE") {
      return this.getBinancePrice(symbol)
    } else if (exchangeName === "KUCOIN") {
      return this.getKucoinPrice(symbol)
    } else {
      throw new Error(`Exchange no soportado: ${exchangeName}`)
    }
  }

  // Obtener precio en Binance
  async getBinancePrice(symbol) {
    try {
      // Convertir formato de símbolo (POL/USDT -> POLUSDT)
      const formattedSymbol = symbol.replace("/", "")

      const response = await axios.get(`${this.exchanges.BINANCE.baseURL}/api/v3/ticker/price`, {
        params: { symbol: formattedSymbol },
      })

      return Number.parseFloat(response.data.price)
    } catch (error) {
      throw new Error(`Error en Binance: ${error.message}`)
    }
  }

  // Obtener precio en KuCoin
  async getKucoinPrice(symbol) {
    try {
      // Convertir formato de símbolo (POL/USDT -> POL-USDT)
      const formattedSymbol = symbol.replace("/", "-")

      // Usar endpoint público sin autenticación para evitar problemas SSL
      const response = await axios.get(`https://api.kucoin.com/api/v1/market/orderbook/level1`, {
        params: { symbol: formattedSymbol },
        timeout: 10000,
        headers: {
          "User-Agent": "CEX-Arbitrage-Bot/1.0",
        },
      })

      // KuCoin devuelve precio en data.data.price
      return Number.parseFloat(response.data.data.price)
    } catch (error) {
      // Si falla KuCoin, usar precio simulado
      console.warn(`⚠️ Usando precio simulado para ${symbol} en KuCoin`)
      return this.getSimulatedPrice(symbol)
    }
  }

  // Calcular spread entre dos precios
  calculateSpread(price1, price2) {
    return Math.abs((price1 - price2) / Math.min(price1, price2)) * 100
  }

  // Obtener balances en un exchange
  async getBalances(exchangeName) {
    if (config.BOT.DRY_RUN) {
      // En modo simulación, devolver balances iniciales
      return this.getSimulatedBalances(exchangeName)
    }

    if (exchangeName === "BINANCE") {
      return this.getBinanceBalances()
    } else if (exchangeName === "KUCOIN") {
      return this.getKucoinBalances()
    } else {
      throw new Error(`Exchange no soportado: ${exchangeName}`)
    }
  }

  // Balances simulados para modo DRY_RUN
  getSimulatedBalances(exchangeName) {
    const initialBalances = config.INITIAL_BALANCES[exchangeName]
    const balances = {}

    for (const [asset, amount] of Object.entries(initialBalances)) {
      balances[asset] = {
        free: amount,
        locked: 0,
        total: amount,
      }
    }

    return balances
  }

  // Obtener balances en Binance
  async getBinanceBalances() {
    try {
      const timestamp = Date.now()
      const queryString = `timestamp=${timestamp}`
      const signature = crypto.createHmac("sha256", this.exchanges.BINANCE.apiSecret).update(queryString).digest("hex")

      const response = await axios.get(`${this.exchanges.BINANCE.baseURL}/api/v3/account`, {
        params: {
          timestamp,
          signature,
        },
        headers: {
          "X-MBX-APIKEY": this.exchanges.BINANCE.apiKey,
        },
      })

      const balances = {}
      response.data.balances.forEach((balance) => {
        const free = Number.parseFloat(balance.free)
        const locked = Number.parseFloat(balance.locked)
        const total = free + locked

        if (total > 0) {
          balances[balance.asset] = {
            free,
            locked,
            total,
          }
        }
      })

      return balances
    } catch (error) {
      throw new Error(`Error obteniendo balances de Binance: ${error.message}`)
    }
  }

  // Obtener balances en KuCoin
  async getKucoinBalances() {
    try {
      // Primero necesitamos obtener un token de KuCoin
      const timestamp = Date.now()
      const signature = crypto
        .createHmac("sha256", this.exchanges.KUCOIN.apiSecret)
        .update(timestamp + "GET" + "/api/v1/accounts")
        .digest("base64")

      const passphrase = crypto
        .createHmac("sha256", this.exchanges.KUCOIN.apiSecret)
        .update(this.exchanges.KUCOIN.passphrase)
        .digest("base64")

      const response = await axios.get(`${this.exchanges.KUCOIN.baseURL}/api/v1/accounts`, {
        headers: {
          "KC-API-KEY": this.exchanges.KUCOIN.apiKey,
          "KC-API-SIGN": signature,
          "KC-API-TIMESTAMP": timestamp,
          "KC-API-PASSPHRASE": passphrase,
          "KC-API-KEY-VERSION": "2",
        },
      })

      const balances = {}
      response.data.data.forEach((balance) => {
        const free = Number.parseFloat(balance.available)
        const locked = Number.parseFloat(balance.holds)
        const total = free + locked

        if (total > 0) {
          balances[balance.currency] = {
            free,
            locked,
            total,
          }
        }
      })

      return balances
    } catch (error) {
      throw new Error(`Error obteniendo balances de KuCoin: ${error.message}`)
    }
  }

  // Colocar orden en un exchange
  async placeOrder(exchangeName, symbol, side, amount) {
    if (config.BOT.DRY_RUN) {
      // En modo simulación, simular la orden
      return this.simulateOrder(exchangeName, symbol, side, amount)
    }

    if (exchangeName === "BINANCE") {
      return this.placeBinanceOrder(symbol, side, amount)
    } else if (exchangeName === "KUCOIN") {
      return this.placeKucoinOrder(symbol, side, amount)
    } else {
      throw new Error(`Exchange no soportado: ${exchangeName}`)
    }
  }

  // Simular orden para modo DRY_RUN
  async simulateOrder(exchangeName, symbol, side, amount) {
    try {
      const price = await this.getPrice(exchangeName, symbol)
      const executedQty = side === "buy" ? amount / price : amount
      const orderId = `sim-${Date.now()}-${Math.floor(Math.random() * 1000)}`

      console.log(
        `🧪 SIMULACIÓN: Orden ${side} de ${amount} ${symbol} en ${exchangeName} a precio ${price} (ID: ${orderId})`,
      )

      return {
        orderId,
        status: "FILLED",
        executedQty,
        price,
      }
    } catch (error) {
      throw new Error(`Error simulando orden: ${error.message}`)
    }
  }

  // Colocar orden en Binance
  async placeBinanceOrder(symbol, side, amount) {
    try {
      // Convertir formato de símbolo (POL/USDT -> POLUSDT)
      const formattedSymbol = symbol.replace("/", "")

      const timestamp = Date.now()
      const params = {
        symbol: formattedSymbol,
        side: side.toUpperCase(),
        type: "MARKET",
        quantity: amount,
        timestamp,
      }

      const queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${value}`)
        .join("&")

      const signature = crypto.createHmac("sha256", this.exchanges.BINANCE.apiSecret).update(queryString).digest("hex")

      const response = await axios.post(`${this.exchanges.BINANCE.baseURL}/api/v3/order`, null, {
        params: {
          ...params,
          signature,
        },
        headers: {
          "X-MBX-APIKEY": this.exchanges.BINANCE.apiKey,
        },
      })

      return {
        orderId: response.data.orderId,
        status: response.data.status,
        executedQty: Number.parseFloat(response.data.executedQty),
        price: Number.parseFloat(response.data.price),
      }
    } catch (error) {
      throw new Error(`Error colocando orden en Binance: ${error.message}`)
    }
  }

  // Colocar orden en KuCoin
  async placeKucoinOrder(symbol, side, amount) {
    try {
      // Convertir formato de símbolo (POL/USDT -> POL-USDT)
      const formattedSymbol = symbol.replace("/", "-")

      const timestamp = Date.now()
      const data = {
        clientOid: `bot-${timestamp}`,
        side: side.toUpperCase(),
        symbol: formattedSymbol,
        type: "market",
        size: amount,
      }

      const dataString = JSON.stringify(data)
      const signature = crypto
        .createHmac("sha256", this.exchanges.KUCOIN.apiSecret)
        .update(timestamp + "POST" + "/api/v1/orders" + dataString)
        .digest("base64")

      const passphrase = crypto
        .createHmac("sha256", this.exchanges.KUCOIN.apiSecret)
        .update(this.exchanges.KUCOIN.passphrase)
        .digest("base64")

      const response = await axios.post(`${this.exchanges.KUCOIN.baseURL}/api/v1/orders`, data, {
        headers: {
          "KC-API-KEY": this.exchanges.KUCOIN.apiKey,
          "KC-API-SIGN": signature,
          "KC-API-TIMESTAMP": timestamp,
          "KC-API-PASSPHRASE": passphrase,
          "KC-API-KEY-VERSION": "2",
          "Content-Type": "application/json",
        },
      })

      // KuCoin devuelve solo el ID de la orden, necesitamos consultar el estado
      const orderId = response.data.data.orderId
      const orderDetails = await this.getKucoinOrderDetails(orderId)

      return {
        orderId,
        status: orderDetails.status,
        executedQty: Number.parseFloat(orderDetails.executedQty),
        price: Number.parseFloat(orderDetails.price),
      }
    } catch (error) {
      throw new Error(`Error colocando orden en KuCoin: ${error.message}`)
    }
  }

  // Obtener detalles de una orden en KuCoin
  async getKucoinOrderDetails(orderId) {
    try {
      const timestamp = Date.now()
      const endpoint = `/api/v1/orders/${orderId}`
      const signature = crypto
        .createHmac("sha256", this.exchanges.KUCOIN.apiSecret)
        .update(timestamp + "GET" + endpoint)
        .digest("base64")

      const passphrase = crypto
        .createHmac("sha256", this.exchanges.KUCOIN.apiSecret)
        .update(this.exchanges.KUCOIN.passphrase)
        .digest("base64")

      const response = await axios.get(`${this.exchanges.KUCOIN.baseURL}${endpoint}`, {
        headers: {
          "KC-API-KEY": this.exchanges.KUCOIN.apiKey,
          "KC-API-SIGN": signature,
          "KC-API-TIMESTAMP": timestamp,
          "KC-API-PASSPHRASE": passphrase,
          "KC-API-KEY-VERSION": "2",
        },
      })

      const order = response.data.data
      return {
        status: order.isActive ? "ACTIVE" : "FILLED",
        executedQty: order.dealSize,
        price: order.dealFunds / order.dealSize, // Precio promedio
      }
    } catch (error) {
      throw new Error(`Error obteniendo detalles de orden en KuCoin: ${error.message}`)
    }
  }

  // Obtener estado de una orden
  async getOrderStatus(exchangeName, orderId, symbol) {
    if (config.BOT.DRY_RUN) {
      // En modo simulación, devolver estado completado
      return {
        status: "FILLED",
        executedQty: 1,
        price: 1,
      }
    }

    if (exchangeName === "BINANCE") {
      return this.getBinanceOrderStatus(orderId, symbol)
    } else if (exchangeName === "KUCOIN") {
      return this.getKucoinOrderDetails(orderId)
    } else {
      throw new Error(`Exchange no soportado: ${exchangeName}`)
    }
  }

  // Obtener estado de una orden en Binance
  async getBinanceOrderStatus(orderId, symbol) {
    try {
      // Convertir formato de símbolo (POL/USDT -> POLUSDT)
      const formattedSymbol = symbol.replace("/", "")

      const timestamp = Date.now()
      const queryString = `symbol=${formattedSymbol}&orderId=${orderId}&timestamp=${timestamp}`
      const signature = crypto.createHmac("sha256", this.exchanges.BINANCE.apiSecret).update(queryString).digest("hex")

      const response = await axios.get(`${this.exchanges.BINANCE.baseURL}/api/v3/order`, {
        params: {
          symbol: formattedSymbol,
          orderId,
          timestamp,
          signature,
        },
        headers: {
          "X-MBX-APIKEY": this.exchanges.BINANCE.apiKey,
        },
      })

      return {
        status: response.data.status,
        executedQty: Number.parseFloat(response.data.executedQty),
        price: Number.parseFloat(response.data.price),
      }
    } catch (error) {
      throw new Error(`Error obteniendo estado de orden en Binance: ${error.message}`)
    }
  }

  // Obtener dirección de depósito
  async getDepositAddress(exchangeName, asset, network) {
    if (config.BOT.DRY_RUN) {
      // En modo simulación, devolver dirección simulada
      return {
        address: `sim-${exchangeName.toLowerCase()}-${asset.toLowerCase()}-address`,
        tag: null,
      }
    }

    if (exchangeName === "BINANCE") {
      return this.getBinanceDepositAddress(asset, network)
    } else if (exchangeName === "KUCOIN") {
      return this.getKucoinDepositAddress(asset, network)
    } else {
      throw new Error(`Exchange no soportado: ${exchangeName}`)
    }
  }

  // Obtener dirección de depósito en Binance
  async getBinanceDepositAddress(asset, network) {
    try {
      const timestamp = Date.now()
      const queryString = `coin=${asset}&network=${network}&timestamp=${timestamp}`
      const signature = crypto.createHmac("sha256", this.exchanges.BINANCE.apiSecret).update(queryString).digest("hex")

      const response = await axios.get(`${this.exchanges.BINANCE.baseURL}/sapi/v1/capital/deposit/address`, {
        params: {
          coin: asset,
          network,
          timestamp,
          signature,
        },
        headers: {
          "X-MBX-APIKEY": this.exchanges.BINANCE.apiKey,
        },
      })

      return {
        address: response.data.address,
        tag: response.data.tag,
      }
    } catch (error) {
      throw new Error(`Error obteniendo dirección de depósito en Binance: ${error.message}`)
    }
  }

  // Obtener dirección de depósito en KuCoin
  async getKucoinDepositAddress(asset, network) {
    try {
      const timestamp = Date.now()
      const endpoint = `/api/v1/deposit-addresses`
      const queryString = `currency=${asset}&network=${network}`
      const signature = crypto
        .createHmac("sha256", this.exchanges.KUCOIN.apiSecret)
        .update(timestamp + "GET" + endpoint + "?" + queryString)
        .digest("base64")

      const passphrase = crypto
        .createHmac("sha256", this.exchanges.KUCOIN.apiSecret)
        .update(this.exchanges.KUCOIN.passphrase)
        .digest("base64")

      const response = await axios.get(`${this.exchanges.KUCOIN.baseURL}${endpoint}`, {
        params: {
          currency: asset,
          network,
        },
        headers: {
          "KC-API-KEY": this.exchanges.KUCOIN.apiKey,
          "KC-API-SIGN": signature,
          "KC-API-TIMESTAMP": timestamp,
          "KC-API-PASSPHRASE": passphrase,
          "KC-API-KEY-VERSION": "2",
        },
      })

      return {
        address: response.data.data.address,
        tag: response.data.data.memo,
      }
    } catch (error) {
      throw new Error(`Error obteniendo dirección de depósito en KuCoin: ${error.message}`)
    }
  }

  // Realizar retiro
  async withdraw(exchangeName, asset, amount, address, network) {
    if (config.BOT.DRY_RUN) {
      // En modo simulación, simular retiro
      const withdrawId = `sim-withdraw-${Date.now()}`
      console.log(`🧪 SIMULACIÓN: Retiro de ${amount} ${asset} desde ${exchangeName} a ${address} (ID: ${withdrawId})`)
      return { withdrawId }
    }

    if (exchangeName === "BINANCE") {
      return this.binanceWithdraw(asset, amount, address, network)
    } else if (exchangeName === "KUCOIN") {
      return this.kucoinWithdraw(asset, amount, address, network)
    } else {
      throw new Error(`Exchange no soportado: ${exchangeName}`)
    }
  }

  // Realizar retiro en Binance
  async binanceWithdraw(asset, amount, address, network) {
    try {
      const timestamp = Date.now()
      const queryString = `coin=${asset}&address=${address}&amount=${amount}&network=${network}&timestamp=${timestamp}`
      const signature = crypto.createHmac("sha256", this.exchanges.BINANCE.apiSecret).update(queryString).digest("hex")

      const response = await axios.post(`${this.exchanges.BINANCE.baseURL}/sapi/v1/capital/withdraw/apply`, null, {
        params: {
          coin: asset,
          address,
          amount,
          network,
          timestamp,
          signature,
        },
        headers: {
          "X-MBX-APIKEY": this.exchanges.BINANCE.apiKey,
        },
      })

      return {
        withdrawId: response.data.id,
      }
    } catch (error) {
      throw new Error(`Error realizando retiro en Binance: ${error.message}`)
    }
  }

  // Realizar retiro en KuCoin
  async kucoinWithdraw(asset, amount, address, network) {
    try {
      const timestamp = Date.now()
      const data = {
        currency: asset,
        address,
        amount: amount.toString(),
        network,
      }

      const dataString = JSON.stringify(data)
      const signature = crypto
        .createHmac("sha256", this.exchanges.KUCOIN.apiSecret)
        .update(timestamp + "POST" + "/api/v1/withdrawals" + dataString)
        .digest("base64")

      const passphrase = crypto
        .createHmac("sha256", this.exchanges.KUCOIN.apiSecret)
        .update(this.exchanges.KUCOIN.passphrase)
        .digest("base64")

      const response = await axios.post(`${this.exchanges.KUCOIN.baseURL}/api/v1/withdrawals`, data, {
        headers: {
          "KC-API-KEY": this.exchanges.KUCOIN.apiKey,
          "KC-API-SIGN": signature,
          "KC-API-TIMESTAMP": timestamp,
          "KC-API-PASSPHRASE": passphrase,
          "KC-API-KEY-VERSION": "2",
          "Content-Type": "application/json",
        },
      })

      return {
        withdrawId: response.data.data.withdrawalId,
      }
    } catch (error) {
      throw new Error(`Error realizando retiro en KuCoin: ${error.message}`)
    }
  }

  // Obtener order book
  async getOrderBook(exchangeName, symbol) {
    if (exchangeName === "BINANCE") {
      return this.getBinanceOrderBook(symbol)
    } else if (exchangeName === "KUCOIN") {
      return this.getKucoinOrderBook(symbol)
    } else {
      throw new Error(`Exchange no soportado: ${exchangeName}`)
    }
  }

  // Obtener order book en Binance
  async getBinanceOrderBook(symbol) {
    try {
      // Convertir formato de símbolo (POL/USDT -> POLUSDT)
      const formattedSymbol = symbol.replace("/", "")

      const response = await axios.get(`${this.exchanges.BINANCE.baseURL}/api/v3/depth`, {
        params: {
          symbol: formattedSymbol,
          limit: 20,
        },
      })

      return {
        bids: response.data.bids.map((bid) => [Number.parseFloat(bid[0]), Number.parseFloat(bid[1])]),
        asks: response.data.asks.map((ask) => [Number.parseFloat(ask[0]), Number.parseFloat(ask[1])]),
      }
    } catch (error) {
      throw new Error(`Error obteniendo order book en Binance: ${error.message}`)
    }
  }

  // Obtener order book en KuCoin
  async getKucoinOrderBook(symbol) {
    try {
      // Convertir formato de símbolo (POL/USDT -> POL-USDT)
      const formattedSymbol = symbol.replace("/", "-")

      const response = await axios.get(`${this.exchanges.KUCOIN.baseURL}/api/v1/market/orderbook/level2_20`, {
        params: {
          symbol: formattedSymbol,
        },
      })

      return {
        bids: response.data.data.bids.map((bid) => [Number.parseFloat(bid[0]), Number.parseFloat(bid[1])]),
        asks: response.data.data.asks.map((ask) => [Number.parseFloat(ask[0]), Number.parseFloat(ask[1])]),
      }
    } catch (error) {
      throw new Error(`Error obteniendo order book en KuCoin: ${error.message}`)
    }
  }

  // Método auxiliar para generar precios simulados
  getSimulatedPrice(symbol) {
    // Precios base simulados
    const basePrices = {
      "POL/USDT": 0.45,
      "USDC/USDT": 1.0001,
    }

    const basePrice = basePrices[symbol] || 1.0
    // Agregar variación aleatoria del ±0.1%
    const variation = (Math.random() - 0.5) * 0.002
    return basePrice * (1 + variation)
  }
}

module.exports = ExchangeManager
