// ========== MOTOR DE BACKTESTING HISTÓRICO ==========
const fs = require('fs').promises
const path = require('path')
const config = require("../strategies/config") // ✅ CORRECTO

class BacktestEngine {
  constructor(strategyManager) {
    this.strategyManager = strategyManager
    this.historicalData = new Map()
    this.backtestResults = []
    this.isRunning = false
  }

  async loadHistoricalData(pair, startDate, endDate) {
    try {
      const dataPath = path.join(config.BACKTESTING.HISTORICAL_DATA_PATH, `${pair.replace('/', '_')}.json`)
      
      // Intentar cargar datos existentes
      try {
        const data = await fs.readFile(dataPath, 'utf8')
        const historicalData = JSON.parse(data)
        
        // Filtrar por rango de fechas
        const filteredData = historicalData.filter(point => {
          const timestamp = new Date(point.timestamp).getTime()
          return timestamp >= startDate.getTime() && timestamp <= endDate.getTime()
        })
        
        this.historicalData.set(pair, filteredData)
        console.log(`📊 Cargados ${filteredData.length} puntos de datos históricos para ${pair}`)
        
        return filteredData
      } catch (fileError) {
        // Si no hay datos históricos, generar datos simulados
        console.log(`⚠️ No se encontraron datos históricos para ${pair}, generando datos simulados...`)
        const simulatedData = this.generateSimulatedData(pair, startDate, endDate)
        this.historicalData.set(pair, simulatedData)
        
        // Guardar datos simulados para uso futuro
        await this.saveHistoricalData(pair, simulatedData)
        
        return simulatedData
      }
    } catch (error) {
      console.error(`❌ Error cargando datos históricos para ${pair}:`, error)
      throw error
    }
  }

  generateSimulatedData(pair, startDate, endDate) {
    const data = []
    const basePrice = this.getBasePriceForPair(pair)
    let currentPrice = basePrice
    
    const totalMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60)
    const interval = 5 // 5 minutos entre puntos de datos
    
    for (let i = 0; i < totalMinutes; i += interval) {
      const timestamp = new Date(startDate.getTime() + i * 60 * 1000)
      
      // Simular movimiento de precio con volatilidad
      const volatility = 0.02 // 2% volatilidad
      const randomChange = (Math.random() - 0.5) * volatility
      currentPrice *= (1 + randomChange)
      
      // Simular datos de ambos exchanges con spread
      const spread = (Math.random() * 0.01) + 0.001 // 0.1% - 1.1% spread
      const binancePrice = currentPrice * (1 - spread / 2)
      const kucoinPrice = currentPrice * (1 + spread / 2)
      
      data.push({
        timestamp: timestamp.toISOString(),
        pair,
        binance: {
          price: binancePrice,
          volume: Math.random() * 1000000,
        },
        kucoin: {
          price: kucoinPrice,
          volume: Math.random() * 800000,
        },
        spread: ((kucoinPrice - binancePrice) / binancePrice) * 100,
        volatility: this.calculateVolatility(data.slice(-20).map(d => d.binance.price)),
      })
    }
    
    return data
  }

  getBasePriceForPair(pair) {
    const basePrices = {
      'POL/USDT': 0.45,
      'USDC/USDT': 1.0,
      'BTC/USDT': 45000,
      'ETH/USDT': 3000,
    }
    return basePrices[pair] || 1.0
  }

  calculateVolatility(prices) {
    if (prices.length < 2) return 0
    
    const returns = []
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1])
    }
    
    const avgReturn = returns.reduce((a, b) => a + b) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
    
    return Math.sqrt(variance)
  }

  async runBacktest(options = {}) {
    const {
      pairs = config.TRADING_PAIRS.map(p => p.symbol),
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 días atrás
      endDate = new Date(),
      initialBalance = config.BACKTESTING.INITIAL_BALANCE_SIM,
      strategy = 'BALANCED',
      maxTrades = 100,
    } = options

    if (this.isRunning) {
      throw new Error('Ya hay un backtest en ejecución')
    }

    this.isRunning = true
    console.log(`🔄 Iniciando backtest: ${startDate.toDateString()} - ${endDate.toDateString()}`)

    try {
      const results = {
        id: Date.now(),
        startDate,
        endDate,
        strategy,
        initialBalance,
        pairs,
        trades: [],
        performance: {},
        summary: {},
        timestamp: new Date(),
      }

      // Cargar datos históricos para todos los pares
      for (const pair of pairs) {
        await this.loadHistoricalData(pair, startDate, endDate)
      }

      // Simular trading
      const simulation = await this.simulateTrading(results, maxTrades)
      results.trades = simulation.trades
      results.performance = simulation.performance
      results.summary = this.calculateSummary(simulation)

      this.backtestResults.push(results)
      
      console.log(`✅ Backtest completado: ${results.trades.length} trades simulados`)
      console.log(`📊 Rendimiento: ${results.summary.totalReturn.toFixed(2)}%`)

      // Guardar resultados
      await this.saveBacktestResults(results)

      return results
    } catch (error) {
      console.error('❌ Error en backtest:', error)
      throw error
    } finally {
      this.isRunning = false
    }
  }

  async simulateTrading(backtestConfig, maxTrades) {
    const trades = []
    let currentBalance = backtestConfig.initialBalance
    let totalFees = 0
    const balanceHistory = []

    // Obtener todos los puntos de datos ordenados por tiempo
    const allDataPoints = []
    for (const pair of backtestConfig.pairs) {
      const pairData = this.historicalData.get(pair) || []
      pairData.forEach(point => {
        allDataPoints.push({ ...point, pair })
      })
    }

    allDataPoints.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

    console.log(`📈 Simulando trading con ${allDataPoints.length} puntos de datos...`)

    for (let i = 0; i < allDataPoints.length && trades.length < maxTrades; i++) {
      const dataPoint = allDataPoints[i]
      
      // Simular detección de oportunidad
      const opportunity = this.simulateOpportunityDetection(dataPoint)
      
      if (opportunity && opportunity.profitable) {
        // Evaluar con la estrategia seleccionada
        const evaluatedOpp = this.strategyManager.strategies.get(backtestConfig.strategy)?.evaluate(opportunity)
        
        if (evaluatedOpp && currentBalance >= evaluatedOpp.tradeAmount) {
          // Simular ejecución del trade
          const tradeResult = this.simulateTradeExecution(evaluatedOpp, dataPoint)
          
          if (tradeResult.success) {
            const fees = evaluatedOpp.tradeAmount * (config.BACKTESTING.FEE_PERCENTAGE_SIM / 100)
            const netProfit = tradeResult.profit - fees
            
            currentBalance += netProfit
            totalFees += fees
            
            trades.push({
              timestamp: dataPoint.timestamp,
              pair: dataPoint.pair,
              type: 'ARBITRAGE',
              amount: evaluatedOpp.tradeAmount,
              profit: netProfit,
              fees,
              balance: currentBalance,
              strategy: backtestConfig.strategy,
              confidence: evaluatedOpp.confidence,
            })
          }
        }
      }

      // Registrar balance cada 100 puntos
      if (i % 100 === 0) {
        balanceHistory.push({
          timestamp: dataPoint.timestamp,
          balance: currentBalance,
        })
      }
    }

    return {
      trades,
      performance: {
        initialBalance: backtestConfig.initialBalance,
        finalBalance: currentBalance,
        totalFees,
        balanceHistory,
      }
    }
  }

  simulateOpportunityDetection(dataPoint) {
    const binancePrice = dataPoint.binance.price
    const kucoinPrice = dataPoint.kucoin.price
    
    if (!binancePrice || !kucoinPrice) return null

    // Calcular oportunidad de arbitraje
    const spread = Math.abs(kucoinPrice - binancePrice)
    const spreadPercent = (spread / Math.min(binancePrice, kucoinPrice)) * 100
    
    // Determinar dirección del arbitraje
    const buyExchange = binancePrice < kucoinPrice ? 'BINANCE' : 'KUCOIN'
    const sellExchange = binancePrice < kucoinPrice ? 'KUCOIN' : 'BINANCE'
    const buyPrice = Math.min(binancePrice, kucoinPrice)
    const sellPrice = Math.max(binancePrice, kucoinPrice)
    
    // Simular fees y costos
    const tradingFees = 0.2 // 0.2% total en fees
    const netProfit = spreadPercent - tradingFees
    
    return {
      pair: dataPoint.pair,
      buyExchange,
      sellExchange,
      buyPrice,
      sellPrice,
      spread: spreadPercent,
      finalProfit: netProfit,
      profitable: netProfit > 0.1, // Mínimo 0.1% profit
      confidence: Math.min(0.9, Math.max(0.1, netProfit / 2)), // Confianza basada en profit
      tradeAmount: 50, // Monto fijo para simulación
      timestamp: new Date(dataPoint.timestamp).getTime(),
    }
  }

  simulateTradeExecution(opportunity, dataPoint) {
    // Simular éxito/fallo basado en condiciones de mercado
    const volatility = dataPoint.volatility || 0
    const volume = Math.min(dataPoint.binance.volume, dataPoint.kucoin.volume)
    
    // Factores que afectan el éxito
    let successProbability = 0.8 // Base 80%
    
    // Reducir probabilidad con alta volatilidad
    if (volatility > 0.05) successProbability -= 0.2
    
    // Reducir probabilidad con bajo volumen
    if (volume < 100000) successProbability -= 0.1
    
    // Aumentar probabilidad con alto profit
    if (opportunity.finalProfit > 1.0) successProbability += 0.1
    
    const success = Math.random() < successProbability
    
    if (success) {
      // Simular slippage
      const slippage = Math.random() * 0.1 // Hasta 0.1% slippage
      const actualProfit = (opportunity.finalProfit - slippage) * opportunity.tradeAmount / 100
      
      return {
        success: true,
        profit: Math.max(0, actualProfit),
        executionTime: Math.random() * 30000 + 5000, // 5-35 segundos
      }
    } else {
      return {
        success: false,
        profit: 0,
        reason: 'Fallo en ejecución simulada',
      }
    }
  }

  calculateSummary(simulation) {
    const { trades, performance } = simulation
    const { initialBalance, finalBalance, totalFees } = performance
    
    const successfulTrades = trades.filter(t => t.profit > 0)
    const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0)
    const totalReturn = ((finalBalance - initialBalance) / initialBalance) * 100
    
    const profitableTrades = trades.filter(t => t.profit > 0)
    const losingTrades = trades.filter(t => t.profit <= 0)
    
    const avgProfit = profitableTrades.length > 0 
      ? profitableTrades.reduce((sum, t) => sum + t.profit, 0) / profitableTrades.length 
      : 0
    
    const avgLoss = losingTrades.length > 0 
      ? Math.abs(losingTrades.reduce((sum, t) => sum + t.profit, 0)) / losingTrades.length 
      : 0

    const maxDrawdown = this.calculateMaxDrawdown(performance.balanceHistory)
    const sharpeRatio = this.calculateSharpeRatio(trades)
    
    return {
      totalTrades: trades.length,
      successfulTrades: successfulTrades.length,
      successRate: trades.length > 0 ? (successfulTrades.length / trades.length) * 100 : 0,
      totalProfit,
      totalReturn,
      totalFees,
      avgProfit,
      avgLoss,
      profitFactor: avgLoss > 0 ? avgProfit / avgLoss : 0,
      maxDrawdown,
      sharpeRatio,
      finalBalance,
      roi: totalReturn,
    }
  }

  calculateMaxDrawdown(balanceHistory) {
    if (balanceHistory.length < 2) return 0
    
    let maxDrawdown = 0
    let peak = balanceHistory[0].balance
    
    for (const point of balanceHistory) {
      if (point.balance > peak) {
        peak = point.balance
      } else {
        const drawdown = ((peak - point.balance) / peak) * 100
        maxDrawdown = Math.max(maxDrawdown, drawdown)
      }
    }
    
    return maxDrawdown
  }

  calculateSharpeRatio(trades) {
    if (trades.length < 2) return 0
    
    const returns = trades.map(t => (t.profit / t.amount) * 100)
    const avgReturn = returns.reduce((a, b) => a + b) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
    const stdDev = Math.sqrt(variance)
    
    return stdDev > 0 ? avgReturn / stdDev : 0
  }

  async saveHistoricalData(pair, data) {
    try {
      const dataPath = path.join(config.BACKTESTING.HISTORICAL_DATA_PATH, `${pair.replace('/', '_')}.json`)
      
      // Crear directorio si no existe
      await fs.mkdir(path.dirname(dataPath), { recursive: true })
      
      await fs.writeFile(dataPath, JSON.stringify(data, null, 2))
      console.log(`💾 Datos históricos guardados para ${pair}`)
    } catch (error) {
      console.error(`❌ Error guardando datos históricos para ${pair}:`, error)
    }
  }

  async saveBacktestResults(results) {
    try {
      const resultsPath = path.join(config.BACKTESTING.HISTORICAL_DATA_PATH, 'backtest_results.json')
      
      // Cargar resultados existentes
      let existingResults = []
      try {
        const data = await fs.readFile(resultsPath, 'utf8')
        existingResults = JSON.parse(data)
      } catch (error) {
        // Archivo no existe, usar array vacío
      }
      
      existingResults.push(results)
      
      // Mantener solo los últimos 50 resultados
      if (existingResults.length > 50) {
        existingResults = existingResults.slice(-50)
      }
      
      await fs.writeFile(resultsPath, JSON.stringify(existingResults, null, 2))
      console.log('💾 Resultados de backtest guardados')
    } catch (error) {
      console.error('❌ Error guardando resultados de backtest:', error)
    }
  }

  async getBacktestHistory() {
    try {
      const resultsPath = path.join(config.BACKTESTING.HISTORICAL_DATA_PATH, 'backtest_results.json')
      const data = await fs.readFile(resultsPath, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      return []
    }
  }

  compareStrategies(backtestResults) {
    const strategyPerformance = new Map()
    
    for (const result of backtestResults) {
      const strategy = result.strategy
      if (!strategyPerformance.has(strategy)) {
        strategyPerformance.set(strategy, {
          backtests: 0,
          avgReturn: 0,
          avgSharpe: 0,
          avgSuccessRate: 0,
          totalReturn: 0,
        })
      }
      
      const perf = strategyPerformance.get(strategy)
      perf.backtests++
      perf.totalReturn += result.summary.totalReturn
      perf.avgReturn = perf.totalReturn / perf.backtests
      perf.avgSharpe = (perf.avgSharpe * (perf.backtests - 1) + result.summary.sharpeRatio) / perf.backtests
      perf.avgSuccessRate = (perf.avgSuccessRate * (perf.backtests - 1) + result.summary.successRate) / perf.backtests
    }
    
    return Object.fromEntries(strategyPerformance)
  }
}

module.exports = { BacktestEngine }