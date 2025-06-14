// ========== MÓDULO DE ASESOR DE TRADING CON IA ==========
// const tf = require("@tensorflow/tfjs-node")
const config = require('../strategies/config')
const EventEmitter = require('events');

class AITradingAdvisor extends EventEmitter {
  constructor() {
    super();
    this.model = null
    this.initialized = false
    this.marketData = {
      priceHistory: new Map(),
      volatilityHistory: new Map(),
      spreadHistory: new Map(),
      profitHistory: [],
    }

    this.initialize()
  }

  async initialize() {
    try {
      // Cargar modelo pre-entrenado o crear uno nuevo
      this.model = await this.createModel()
      this.initialized = true
      console.log("✅ Módulo de IA inicializado correctamente")
    } catch (error) {
      console.error("❌ Error inicializando módulo de IA:", error.message)
    }
  }

  async createModel() {
    // Modelo simplificado sin TensorFlow - usando heurísticas
    console.log("🤖 Usando modelo heurístico simplificado (sin TensorFlow)")
    return {
      predict: (inputData) => {
        // Lógica heurística simple
        const [spread, volatility, hour, dayOfWeek, lastProfit, marketTrend] = inputData.dataSync
          ? inputData.dataSync()
          : inputData[0]

        let probability = 0.5 // Base

        // Ajustar por spread
        if (spread > 0.5) probability += 0.2
        if (spread > 1.0) probability += 0.1

        // Ajustar por volatilidad
        if (volatility < 2.0) probability += 0.1
        if (volatility > 5.0) probability -= 0.2

        // Ajustar por hora del día
        if (hour >= 8 && hour <= 16) probability += 0.1 // Horario activo

        // Ajustar por tendencia de mercado
        if (marketTrend > 0) probability += 0.1

        return { dataSync: () => [Math.min(0.95, Math.max(0.05, probability))] }
      },
    }
  }

  // Registrar datos de mercado para entrenamiento
  recordMarketData(pair, buyPrice, sellPrice, spread, volatility, wasSuccessful = null) {
    const now = new Date()
    const timestamp = now.getTime()
    const hour = now.getHours()
    const dayOfWeek = now.getDay()

    // Registrar precios
    if (!this.marketData.priceHistory.has(pair)) {
      this.marketData.priceHistory.set(pair, [])
    }
    this.marketData.priceHistory.get(pair).push({ buyPrice, sellPrice, timestamp })

    // Registrar spread
    if (!this.marketData.spreadHistory.has(pair)) {
      this.marketData.spreadHistory.set(pair, [])
    }
    this.marketData.spreadHistory.get(pair).push({ spread, timestamp })

    // Registrar volatilidad
    if (!this.marketData.volatilityHistory.has(pair)) {
      this.marketData.volatilityHistory.set(pair, [])
    }
    this.marketData.volatilityHistory.get(pair).push({ volatility, timestamp })

    // Registrar resultado si está disponible
    if (wasSuccessful !== null) {
      this.marketData.profitHistory.push({
        pair,
        spread,
        volatility,
        hour,
        dayOfWeek,
        wasSuccessful,
        timestamp,
      })
    }

    // Limitar el tamaño del historial
    this.pruneHistoricalData()
  }

  pruneHistoricalData() {
    const MAX_HISTORY_ITEMS = 1000
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000
    const cutoffTime = Date.now() - ONE_WEEK_MS

    // Eliminar datos antiguos
    for (const [pair, history] of this.marketData.priceHistory.entries()) {
      this.marketData.priceHistory.set(
        pair,
        history.filter((item) => item.timestamp > cutoffTime).slice(-MAX_HISTORY_ITEMS),
      )
    }

    for (const [pair, history] of this.marketData.spreadHistory.entries()) {
      this.marketData.spreadHistory.set(
        pair,
        history.filter((item) => item.timestamp > cutoffTime).slice(-MAX_HISTORY_ITEMS),
      )
    }

    for (const [pair, history] of this.marketData.volatilityHistory.entries()) {
      this.marketData.volatilityHistory.set(
        pair,
        history.filter((item) => item.timestamp > cutoffTime).slice(-MAX_HISTORY_ITEMS),
      )
    }

    this.marketData.profitHistory = this.marketData.profitHistory
      .filter((item) => item.timestamp > cutoffTime)
      .slice(-MAX_HISTORY_ITEMS)
  }

  async trainModel() {
    if (this.marketData.profitHistory.length < 10) {
      return { success: false, message: "Datos insuficientes para entrenar el modelo heurístico" }
    }

    // Simular entrenamiento con heurísticas
    const recentSuccessRate = this.getRecentProfitTrend()

    console.log(`🤖 Modelo heurístico actualizado con ${this.marketData.profitHistory.length} datos históricos`)

    return {
      success: true,
      accuracy: (recentSuccessRate + 1) / 2, // Convertir de -1,1 a 0,1
      loss: 1 - (recentSuccessRate + 1) / 2,
    }
  }

  getRecentProfitTrend() {
    // Calcular tendencia de ganancias recientes (-1 a 1)
    const recentProfits = this.marketData.profitHistory.slice(-10)
    if (recentProfits.length < 5) return 0

    const successCount = recentProfits.filter((p) => p.wasSuccessful).length
    return (successCount / recentProfits.length) * 2 - 1
  }

  getMarketTrend(pair) {
    // Calcular tendencia del mercado (-1 a 1)
    const priceHistory = this.marketData.priceHistory.get(pair)
    if (!priceHistory || priceHistory.length < 10) return 0

    const recentPrices = priceHistory.slice(-10).map((p) => (p.buyPrice + p.sellPrice) / 2)
    const firstPrice = recentPrices[0]
    const lastPrice = recentPrices[recentPrices.length - 1]

    return (lastPrice - firstPrice) / firstPrice
  }

  async predictOpportunitySuccess(opportunity) {
    if (!this.initialized) {
      return { probability: 0.5, confidence: "LOW" }
    }

    try {
      const now = new Date()
      const hour = now.getHours()
      const dayOfWeek = now.getDay()

      // Preparar datos para predicción heurística
      const inputData = [
        opportunity.grossProfit,
        this.getVolatility(opportunity.pair),
        hour / 24,
        dayOfWeek / 6,
        this.getRecentProfitTrend(),
        this.getMarketTrend(opportunity.pair),
      ]

      // Realizar predicción heurística
      const prediction = this.model.predict([inputData])
      const probability = prediction.dataSync()[0]

      // Determinar nivel de confianza
      let confidence = "MEDIUM"
      if (probability > 0.8 || probability < 0.2) {
        confidence = "HIGH"
      } else if (probability > 0.4 && probability < 0.6) {
        confidence = "LOW"
      }

      return { probability, confidence }
    } catch (error) {
      console.error("Error en predicción:", error)
      return { probability: 0.5, confidence: "LOW" }
    }
  }

  getVolatility(pair) {
    const volatilityHistory = this.marketData.volatilityHistory.get(pair)
    if (!volatilityHistory || volatilityHistory.length === 0) return 0

    // Obtener volatilidad más reciente
    return volatilityHistory[volatilityHistory.length - 1].volatility
  }

  async generateTradingSuggestions(bot) {
    try {
      // Obtener oportunidades actuales
      const opportunities = await bot.findArbitrageOpportunities()

      // Analizar cada oportunidad con IA
      const enhancedOpportunities = await Promise.all(
        opportunities.map(async (opportunity) => {
          // Predecir probabilidad de éxito
          const prediction = await this.predictOpportunitySuccess(opportunity)

          // Calcular tamaño óptimo basado en confianza
          const optimalSize = this.calculateOptimalSize(opportunity, prediction.probability, prediction.confidence)

          // Analizar mejor momento para ejecutar
          const timing = this.analyzeTradingTiming(opportunity.pair)

          return {
            ...opportunity,
            aiPrediction: {
              successProbability: prediction.probability,
              confidence: prediction.confidence,
              optimalSize,
              recommendedTiming: timing.recommendation,
              reasoning: this.generateReasoning(opportunity, prediction, timing),
            },
          }
        }),
      )

      // Ordenar por probabilidad de éxito ajustada por profit
      const sortedOpportunities = enhancedOpportunities
        .filter((o) => o.profitable)
        .sort((a, b) => {
          const scoreA = a.aiPrediction.successProbability * a.finalProfit
          const scoreB = b.aiPrediction.successProbability * b.finalProfit
          return scoreB - scoreA
        })

      // Generar recomendaciones generales
      const generalRecommendations = this.generateGeneralRecommendations(bot)

      return {
        opportunities: sortedOpportunities,
        generalRecommendations,
        marketInsights: this.generateMarketInsights(),
        lastUpdated: new Date().toISOString(),
      }
    } catch (error) {
      console.error("Error generando sugerencias de trading:", error)
      return {
        opportunities: [],
        generalRecommendations: [
          {
            type: "ERROR",
            message: `Error generando sugerencias: ${error.message}`,
            importance: "HIGH",
          },
        ],
        lastUpdated: new Date().toISOString(),
      }
    }
  }

  calculateOptimalSize(opportunity, probability, confidence) {
    // Base: tamaño mínimo del par
    let size = opportunity.tradeAmount

    // Ajustar según probabilidad de éxito
    if (probability > 0.8) {
      // Alta probabilidad de éxito
      size = Math.min(size * 1.5, opportunity.pair.maxTradeAmount)
    } else if (probability < 0.4) {
      // Baja probabilidad de éxito
      size = Math.max(size * 0.5, opportunity.pair.minTradeAmount)
    }

    // Ajustar según nivel de confianza
    if (confidence === "LOW") {
      size = Math.max(size * 0.7, opportunity.pair.minTradeAmount)
    }

    return Number.parseFloat(size.toFixed(2))
  }

  analyzeTradingTiming(pair) {
    const now = new Date()
    const hour = now.getHours()

    // Analizar patrones históricos por hora
    const hourlySuccessRate = this.calculateHourlySuccessRate()
    const currentHourRate = hourlySuccessRate[hour] || 0.5

    let recommendation = "NEUTRAL"
    let reason = ""

    if (currentHourRate > 0.7) {
      recommendation = "EXECUTE_NOW"
      reason = `Alta tasa de éxito histórica (${(currentHourRate * 100).toFixed(1)}%) para esta hora del día`
    } else if (currentHourRate < 0.3) {
      recommendation = "WAIT"
      reason = `Baja tasa de éxito histórica (${(currentHourRate * 100).toFixed(1)}%) para esta hora del día`
    }

    // Verificar volatilidad reciente
    const recentVolatility = this.getRecentVolatility(pair)
    if (recentVolatility > 3.0) {
      recommendation = "WAIT"
      reason = `Alta volatilidad reciente (${recentVolatility.toFixed(1)}%)`
    }

    return { recommendation, reason }
  }

  calculateHourlySuccessRate() {
    const hourlyStats = Array(24)
      .fill(0)
      .map(() => ({ success: 0, total: 0 }))

    // Calcular estadísticas por hora
    this.marketData.profitHistory.forEach((item) => {
      const hour = new Date(item.timestamp).getHours()
      hourlyStats[hour].total++
      if (item.wasSuccessful) {
        hourlyStats[hour].success++
      }
    })

    // Calcular tasas de éxito
    return hourlyStats.map((stats) => (stats.total > 0 ? stats.success / stats.total : 0.5))
  }

  getRecentVolatility(pair) {
    const volatilityHistory = this.marketData.volatilityHistory.get(pair)
    if (!volatilityHistory || volatilityHistory.length < 5) return 0

    // Calcular volatilidad promedio de las últimas 5 mediciones
    const recentVolatilities = volatilityHistory.slice(-5).map((v) => v.volatility)
    return recentVolatilities.reduce((sum, vol) => sum + vol, 0) / recentVolatilities.length
  }

  generateReasoning(opportunity, prediction, timing) {
    const reasoning = []

    // Análisis de probabilidad
    if (prediction.probability > 0.8) {
      reasoning.push(`Alta probabilidad de éxito (${(prediction.probability * 100).toFixed(1)}%)`)
    } else if (prediction.probability < 0.4) {
      reasoning.push(`Baja probabilidad de éxito (${(prediction.probability * 100).toFixed(1)}%)`)
    } else {
      reasoning.push(`Probabilidad moderada de éxito (${(prediction.probability * 100).toFixed(1)}%)`)
    }

    // Análisis de profit
    if (opportunity.finalProfit > opportunity.pair.minProfit * 2) {
      reasoning.push(`Profit potencial alto (${opportunity.finalProfit.toFixed(2)}%)`)
    } else {
      reasoning.push(`Profit potencial moderado (${opportunity.finalProfit.toFixed(2)}%)`)
    }

    // Análisis de timing
    reasoning.push(timing.reason)

    // Análisis de riesgo
    const riskLevel = this.assessRiskLevel(opportunity)
    reasoning.push(`Nivel de riesgo: ${riskLevel.level} (${riskLevel.reason})`)

    return reasoning
  }

  assessRiskLevel(opportunity) {
    // Evaluar nivel de riesgo basado en múltiples factores
    let riskScore = 0
    const reasons = []

    // Factor 1: Volatilidad
    const volatility = this.getVolatility(opportunity.pair)
    if (volatility > 4.0) {
      riskScore += 2
      reasons.push(`alta volatilidad (${volatility.toFixed(1)}%)`)
    } else if (volatility > 2.0) {
      riskScore += 1
      reasons.push(`volatilidad moderada (${volatility.toFixed(1)}%)`)
    }

    // Factor 2: Spread sospechoso
    if (opportunity.grossProfit > config.SECURITY.SUSPICIOUS_PROFIT_THRESHOLD * 0.8) {
      riskScore += 2
      reasons.push(`spread inusualmente alto (${opportunity.grossProfit.toFixed(2)}%)`)
    }

    // Factor 3: Historial del par
    const pairHistory = this.getPairSuccessRate(opportunity.pair)
    if (pairHistory.rate < 0.4 && pairHistory.total > 5) {
      riskScore += 1
      reasons.push(`historial de éxito bajo (${(pairHistory.rate * 100).toFixed(1)}%)`)
    }

    // Determinar nivel
    let level = "BAJO"
    if (riskScore >= 3) {
      level = "ALTO"
    } else if (riskScore >= 1) {
      level = "MEDIO"
    }

    return {
      level,
      reason: reasons.length > 0 ? reasons.join(", ") : "sin factores de riesgo significativos",
    }
  }

  getPairSuccessRate(pair) {
    const pairHistory = this.marketData.profitHistory.filter((item) => item.pair === pair)

    if (pairHistory.length === 0) {
      return { rate: 0.5, total: 0 }
    }

    const successCount = pairHistory.filter((item) => item.wasSuccessful).length
    return {
      rate: successCount / pairHistory.length,
      total: pairHistory.length,
    }
  }

  generateGeneralRecommendations(bot) {
    const recommendations = []

    // Recomendación 1: Basada en rendimiento reciente
    const recentPerformance = this.analyzeRecentPerformance()
    if (recentPerformance.profitRate < 0.3 && recentPerformance.tradeCount > 5) {
      recommendations.push({
        type: "STRATEGY_ADJUSTMENT",
        message: `Considere ajustar parámetros de trading. Tasa de éxito reciente: ${(recentPerformance.profitRate * 100).toFixed(1)}%`,
        importance: "HIGH",
      })
    }

    // Recomendación 2: Basada en volatilidad del mercado
    const marketVolatility = this.getAverageMarketVolatility()
    if (marketVolatility > 4.0) {
      recommendations.push({
        type: "RISK_WARNING",
        message: `Alta volatilidad del mercado (${marketVolatility.toFixed(1)}%). Considere reducir tamaños de operación`,
        importance: "HIGH",
      })
    }

    // Recomendación 3: Oportunidad de rebalanceo
    if (bot.riskManager) {
      const imbalance = this.detectExchangeImbalance(bot)
      if (imbalance.detected) {
        recommendations.push({
          type: "REBALANCE",
          message: `Desbalance detectado: ${imbalance.message}`,
          importance: "MEDIUM",
        })
      }
    }

    // Recomendación 4: Mejores pares para trading
    const bestPairs = this.identifyBestPerformingPairs()
    if (bestPairs.length > 0) {
      recommendations.push({
        type: "PAIR_SUGGESTION",
        message: `Mejores pares por rendimiento: ${bestPairs.map((p) => p.pair).join(", ")}`,
        importance: "MEDIUM",
      })
    }

    return recommendations
  }

  analyzeRecentPerformance() {
    // Analizar rendimiento de las últimas 10 operaciones
    const recentTrades = this.marketData.profitHistory.slice(-10)

    if (recentTrades.length === 0) {
      return { profitRate: 0.5, tradeCount: 0 }
    }

    const successCount = recentTrades.filter((trade) => trade.wasSuccessful).length
    return {
      profitRate: successCount / recentTrades.length,
      tradeCount: recentTrades.length,
    }
  }

  getAverageMarketVolatility() {
    let totalVolatility = 0
    let pairCount = 0

    for (const [pair, history] of this.marketData.volatilityHistory.entries()) {
      if (history.length > 0) {
        // Obtener volatilidad promedio de las últimas 5 mediciones
        const recentVolatilities = history.slice(-5).map((v) => v.volatility)
        const avgVolatility = recentVolatilities.reduce((sum, vol) => sum + vol, 0) / recentVolatilities.length

        totalVolatility += avgVolatility
        pairCount++
      }
    }

    return pairCount > 0 ? totalVolatility / pairCount : 0
  }

  detectExchangeImbalance(bot) {
    try {
      // Verificar si hay un desbalance significativo entre exchanges
      const binanceBalance = bot.balanceCache.get("BINANCE")
      const kucoinBalance = bot.balanceCache.get("KUCOIN")

      if (!binanceBalance || !kucoinBalance) {
        return { detected: false }
      }

      const binanceUsdt = binanceBalance.balances.USDT?.total || 0
      const kucoinUsdt = kucoinBalance.balances.USDT?.total || 0

      const totalUsdt = binanceUsdt + kucoinUsdt
      const threshold = totalUsdt * 0.3 // 30% de desbalance

      if (Math.abs(binanceUsdt - kucoinUsdt) > threshold) {
        const fromExchange = binanceUsdt > kucoinUsdt ? "Binance" : "KuCoin"
        const toExchange = binanceUsdt > kucoinUsdt ? "KuCoin" : "Binance"
        const amount = Math.abs(binanceUsdt - kucoinUsdt) / 2

        return {
          detected: true,
          message: `Considere transferir ~${amount.toFixed(2)} USDT de ${fromExchange} a ${toExchange}`,
        }
      }

      return { detected: false }
    } catch (error) {
      console.error("Error detectando desbalance:", error)
      return { detected: false }
    }
  }

  identifyBestPerformingPairs() {
    const pairStats = new Map()

    // Recopilar estadísticas por par
    this.marketData.profitHistory.forEach((item) => {
      if (!pairStats.has(item.pair)) {
        pairStats.set(item.pair, { success: 0, total: 0 })
      }

      const stats = pairStats.get(item.pair)
      stats.total++
      if (item.wasSuccessful) {
        stats.success++
      }
    })

    // Convertir a array y calcular tasas
    const pairPerformance = Array.from(pairStats.entries())
      .map(([pair, stats]) => ({
        pair,
        successRate: stats.total > 0 ? stats.success / stats.total : 0,
        tradeCount: stats.total,
      }))
      .filter((item) => item.tradeCount >= 5) // Mínimo 5 operaciones

    // Ordenar por tasa de éxito
    pairPerformance.sort((a, b) => b.successRate - a.successRate)

    // Devolver los 3 mejores
    return pairPerformance.slice(0, 3)
  }

  generateMarketInsights() {
    return {
      marketVolatility: this.getAverageMarketVolatility(),
      bestTradingHours: this.identifyBestTradingHours(),
      recentTrends: this.identifyRecentTrends(),
      lastUpdated: new Date().toISOString(),
    }
  }

  identifyBestTradingHours() {
    const hourlySuccessRate = this.calculateHourlySuccessRate()

    // Encontrar las mejores horas (top 3)
    const hourRanking = hourlySuccessRate
      .map((rate, hour) => ({ hour, rate }))
      .filter((item) => item.rate > 0) // Solo horas con datos
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 3)

    return hourRanking.map((item) => ({
      hour: item.hour,
      successRate: item.rate,
      formattedHour: `${item.hour}:00 - ${item.hour + 1}:00`,
    }))
  }

  identifyRecentTrends() {
    const trends = []

    // Analizar tendencias de precios por par
    for (const [pair, history] of this.marketData.priceHistory.entries()) {
      if (history.length < 10) continue

      // Obtener precios recientes
      const recentPrices = history.slice(-10).map((p) => (p.buyPrice + p.sellPrice) / 2)

      // Calcular tendencia
      const firstPrice = recentPrices[0]
      const lastPrice = recentPrices[recentPrices.length - 1]
      const percentChange = ((lastPrice - firstPrice) / firstPrice) * 100

      // Determinar dirección
      let direction = "NEUTRAL"
      if (percentChange > 1.0) {
        direction = "UP"
      } else if (percentChange < -1.0) {
        direction = "DOWN"
      }

      trends.push({
        pair,
        direction,
        percentChange,
        strength: Math.abs(percentChange) > 3.0 ? "STRONG" : "MODERATE",
      })
    }

    return trends
  }

  // ======= AGREGADO PARA DASHBOARD (RECOMENDACIONES SIMPLES) =======
  /**
   * Devuelve recomendaciones actuales simples para el dashboard.
   * (Puedes mejorar esta función para mostrar aún más información si lo deseas)
   */
  getCurrentRecommendations() {
    // Ejemplo básico usando heurística y datos simulados
    const now = new Date()
    const hour = now.getHours()
    const recs = []

    // Ejemplo de recomendación por horario
    if (hour >= 8 && hour <= 16) {
      recs.push({ texto: "Mayor volumen: operar con más confianza", probabilidad: 80 })
    } else {
      recs.push({ texto: "Mercado lento: precaución al operar", probabilidad: 55 })
    }

    // Ejemplo de profit reciente
    const perf = this.analyzeRecentPerformance()
    if (perf.profitRate > 0.7) {
      recs.push({ texto: "El bot está en racha positiva", probabilidad: Math.round(perf.profitRate * 100) })
    } else if (perf.profitRate < 0.3) {
      recs.push({ texto: "Racha negativa: considere cambiar la estrategia", probabilidad: Math.round((1 - perf.profitRate) * 100) })
    } else {
      recs.push({ texto: "Rendimiento estable, mantener parámetros", probabilidad: 60 })
    }

    // Sugerencia de par
    const bestPairs = this.identifyBestPerformingPairs()
    if (bestPairs.length > 0) {
      recs.push({ texto: `Mejores pares: ${bestPairs.map((p) => p.pair).join(", ")}`, probabilidad: 65 })
    }

    return recs
  }
}

module.exports = new AITradingAdvisor()