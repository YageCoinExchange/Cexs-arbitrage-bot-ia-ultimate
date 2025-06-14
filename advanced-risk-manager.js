// ========== GESTIÓN AVANZADA DE RIESGO ==========
const config = require("../strategies/config")

class AdvancedRiskManager {
  constructor() {
    this.exposureMap = new Map()
    this.totalExposure = 0
    this.riskMetrics = new Map()
    this.correlationMatrix = new Map()
    this.volatilityHistory = new Map()
    this.anomalyDetector = new AnomalyDetector()
    this.stressTestResults = []
    this.riskLimits = this.initializeRiskLimits()
    
    // ======= AGREGADO PARA DASHBOARD =======
    this.riskSettings = {
      maxPorOperacion: 100,
      maxTotal: 1000,
    }
    // ======= FIN AGREGADO DASHBOARD =======

    console.log('🛡️ Gestor de Riesgo Avanzado inicializado')
  }

  // ======= AGREGADO PARA DASHBOARD =======
  getRiskSettings() {
    return this.riskSettings
  }
  setRiskSettings(settings) {
    this.riskSettings = { ...this.riskSettings, ...settings }
  }
  // ======= FIN AGREGADO DASHBOARD =======
  
  initializeRiskLimits() {
    return {
      maxDailyLoss: config.BOT.MAX_DAILY_LOSS || -5.0, // -5%
      maxSingleTradeRisk: 2.0, // 2% del portfolio por trade
      maxCorrelatedExposure: 30.0, // 30% en activos correlacionados
      maxVolatilityThreshold: 50.0, // 50% volatilidad anualizada
      maxDrawdown: 10.0, // 10% drawdown máximo
      minLiquidityRatio: 0.2, // 20% mínimo en activos líquidos
      maxConcentrationRisk: 40.0, // 40% máximo en un solo activo
    }
  }

  async assessTradeRisk(opportunity, marketData, portfolioValue) {
    const riskAssessment = {
      riskScore: 0,
      riskLevel: 'LOW',
      riskFactors: [],
      recommendations: [],
      approved: true,
      maxPositionSize: opportunity.tradeAmount,
    }

    try {
      // 1. Riesgo de volatilidad
      const volatilityRisk = this.assessVolatilityRisk(opportunity.pair, marketData)
      riskAssessment.riskScore += volatilityRisk.score
      if (volatilityRisk.factors.length > 0) {
        riskAssessment.riskFactors.push(...volatilityRisk.factors)
      }

      // 2. Riesgo de liquidez
      const liquidityRisk = this.assessLiquidityRisk(opportunity, marketData)
      riskAssessment.riskScore += liquidityRisk.score
      if (liquidityRisk.factors.length > 0) {
        riskAssessment.riskFactors.push(...liquidityRisk.factors)
      }

      // 3. Riesgo de concentración
      const concentrationRisk = this.assessConcentrationRisk(opportunity, portfolioValue)
      riskAssessment.riskScore += concentrationRisk.score
      if (concentrationRisk.factors.length > 0) {
        riskAssessment.riskFactors.push(...concentrationRisk.factors)
      }

      // 4. Riesgo de correlación
      const correlationRisk = this.assessCorrelationRisk(opportunity.pair)
      riskAssessment.riskScore += correlationRisk.score
      if (correlationRisk.factors.length > 0) {
        riskAssessment.riskFactors.push(...correlationRisk.factors)
      }

      // 5. Riesgo temporal
      const temporalRisk = this.assessTemporalRisk()
      riskAssessment.riskScore += temporalRisk.score
      if (temporalRisk.factors.length > 0) {
        riskAssessment.riskFactors.push(...temporalRisk.factors)
      }

      // Determinar nivel de riesgo
      if (riskAssessment.riskScore < 0.3) {
        riskAssessment.riskLevel = 'LOW'
      } else if (riskAssessment.riskScore < 0.7) {
        riskAssessment.riskLevel = 'MEDIUM'
      } else {
        riskAssessment.riskLevel = 'HIGH'
      }

      // Ajustar tamaño de posición basado en riesgo
      riskAssessment.maxPositionSize = this.calculateOptimalPositionSize(
        opportunity,
        riskAssessment.riskScore,
        portfolioValue
      )

      // Generar recomendaciones
      riskAssessment.recommendations = this.generateRiskRecommendations(riskAssessment)

      // Decidir aprobación
      riskAssessment.approved = this.shouldApproveTradeRisk(riskAssessment)

      return riskAssessment
    } catch (error) {
      console.error('❌ Error en evaluación de riesgo:', error)
      return {
        ...riskAssessment,
        riskLevel: 'HIGH',
        approved: false,
        riskFactors: ['Error en evaluación de riesgo'],
      }
    }
  }

  assessVolatilityRisk(pair, marketData) {
    const assessment = { score: 0, factors: [] }
    
    const currentVolatility = marketData.volatility || 0
    const historicalVolatility = this.getHistoricalVolatility(pair)
    
    // Volatilidad actual vs histórica
    if (currentVolatility > historicalVolatility * 1.5) {
      assessment.score += 0.3
      assessment.factors.push(`Volatilidad elevada: ${(currentVolatility * 100).toFixed(1)}%`)
    }

    // Volatilidad absoluta
    if (currentVolatility > this.riskLimits.maxVolatilityThreshold / 100) {
      assessment.score += 0.4
      assessment.factors.push(`Volatilidad excesiva: ${(currentVolatility * 100).toFixed(1)}%`)
    }

    // Cambios súbitos de volatilidad
    const volatilityChange = this.getVolatilityChange(pair)
    if (Math.abs(volatilityChange) > 0.1) {
      assessment.score += 0.2
      assessment.factors.push(`Cambio súbito de volatilidad: ${(volatilityChange * 100).toFixed(1)}%`)
    }

    return assessment
  }

  assessLiquidityRisk(opportunity, marketData) {
    const assessment = { score: 0, factors: [] }
    
    const volume24h = marketData.volume24h || 0
    const avgVolume = marketData.avgVolume || volume24h
    const volumeRatio = avgVolume > 0 ? volume24h / avgVolume : 1

    // Volumen bajo
    if (volumeRatio < 0.5) {
      assessment.score += 0.3
      assessment.factors.push(`Volumen bajo: ${(volumeRatio * 100).toFixed(1)}% del promedio`)
    }

    // Spread amplio (indicador de baja liquidez)
    if (opportunity.spread > 2.0) {
      assessment.score += 0.2
      assessment.factors.push(`Spread amplio: ${opportunity.spread.toFixed(2)}%`)
    }

    // Profundidad del order book
    const orderBookDepth = marketData.orderBookDepth || 0
    if (orderBookDepth < opportunity.tradeAmount * 2) {
      assessment.score += 0.4
      assessment.factors.push('Profundidad insuficiente del order book')
    }

    return assessment
  }

  assessConcentrationRisk(opportunity, portfolioValue) {
    const assessment = { score: 0, factors: [] }
    
    const currentExposure = this.exposureMap.get(opportunity.pair) || 0
    const newExposure = currentExposure + opportunity.tradeAmount
    const concentrationPercent = (newExposure / portfolioValue) * 100

    // Concentración por par
    if (concentrationPercent > this.riskLimits.maxConcentrationRisk) {
      assessment.score += 0.5
      assessment.factors.push(`Concentración excesiva en ${opportunity.pair}: ${concentrationPercent.toFixed(1)}%`)
    }

    // Exposición total
    const newTotalExposure = this.totalExposure + opportunity.tradeAmount
    const totalExposurePercent = (newTotalExposure / portfolioValue) * 100
    
    if (totalExposurePercent > 80) {
      assessment.score += 0.3
      assessment.factors.push(`Exposición total alta: ${totalExposurePercent.toFixed(1)}%`)
    }

    return assessment
  }

  assessCorrelationRisk(pair) {
    const assessment = { score: 0, factors: [] }
    
    const correlatedPairs = this.getCorrelatedPairs(pair)
    let correlatedExposure = 0

    for (const correlatedPair of correlatedPairs) {
      correlatedExposure += this.exposureMap.get(correlatedPair) || 0
    }

    const correlationPercent = (correlatedExposure / this.totalExposure) * 100

    if (correlationPercent > this.riskLimits.maxCorrelatedExposure) {
      assessment.score += 0.4
      assessment.factors.push(`Alta exposición correlacionada: ${correlationPercent.toFixed(1)}%`)
    }

    return assessment
  }

  assessTemporalRisk() {
    const assessment = { score: 0, factors: [] }
    
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDay()

    // Horarios de baja liquidez
    if (hour >= 22 || hour <= 6) {
      assessment.score += 0.1
      assessment.factors.push('Horario de baja liquidez')
    }

    // Fines de semana
    if (day === 0 || day === 6) {
      assessment.score += 0.1
      assessment.factors.push('Trading en fin de semana')
    }

    // Eventos de mercado (simplificado)
    if (this.isHighVolatilityPeriod()) {
      assessment.score += 0.2
      assessment.factors.push('Período de alta volatilidad del mercado')
    }

    return assessment
  }

  calculateOptimalPositionSize(opportunity, riskScore, portfolioValue) {
    const baseSize = opportunity.tradeAmount
    const maxRiskPerTrade = portfolioValue * (this.riskLimits.maxSingleTradeRisk / 100)
    
    // Ajustar por score de riesgo
    const riskAdjustment = Math.max(0.1, 1 - riskScore)
    const adjustedSize = baseSize * riskAdjustment
    
    // Aplicar límites
    return Math.min(adjustedSize, maxRiskPerTrade, baseSize)
  }

  generateRiskRecommendations(riskAssessment) {
    const recommendations = []

    if (riskAssessment.riskLevel === 'HIGH') {
      recommendations.push('Considere reducir el tamaño de la posición')
      recommendations.push('Monitoree de cerca la ejecución')
      recommendations.push('Prepare stop-loss más estricto')
    }

    if (riskAssessment.riskFactors.includes('Volatilidad elevada')) {
      recommendations.push('Espere a que la volatilidad se normalice')
    }

    if (riskAssessment.riskFactors.some(f => f.includes('Concentración'))) {
      recommendations.push('Diversifique la exposición')
    }

    if (riskAssessment.riskFactors.some(f => f.includes('liquidez'))) {
      recommendations.push('Verifique la profundidad del order book')
    }

    return recommendations
  }

  shouldApproveTradeRisk(riskAssessment) {
    // No aprobar si el riesgo es muy alto
    if (riskAssessment.riskScore > 0.8) return false
    
    // No aprobar si hay factores críticos
    const criticalFactors = [
      'Volatilidad excesiva',
      'Concentración excesiva',
      'Profundidad insuficiente'
    ]
    
    for (const factor of riskAssessment.riskFactors) {
      if (criticalFactors.some(critical => factor.includes(critical))) {
        return false
      }
    }

    return true
  }

  async runStressTest(scenarios = []) {
    console.log('🧪 Ejecutando stress test...')
    
    const defaultScenarios = [
      { name: 'Crash 20%', priceChange: -0.20, volumeChange: -0.50 },
      { name: 'Volatilidad Extrema', volatilityMultiplier: 3, spreadMultiplier: 2 },
      { name: 'Liquidez Baja', volumeChange: -0.80, spreadMultiplier: 5 },
      { name: 'Correlación Alta', correlationIncrease: 0.5 },
    ]

    const testScenarios = scenarios.length > 0 ? scenarios : defaultScenarios
    const results = []

    for (const scenario of testScenarios) {
      const result = await this.simulateScenario(scenario)
      results.push(result)
    }

    this.stressTestResults = results
    return results
  }

  async simulateScenario(scenario) {
    const simulation = {
      name: scenario.name,
      parameters: scenario,
      results: {
        portfolioLoss: 0,
        maxDrawdown: 0,
        tradesAffected: 0,
        liquidityImpact: 0,
        riskScore: 0,
      },
      recommendations: [],
    }

    // Simular impacto en portfolio
    if (scenario.priceChange) {
      simulation.results.portfolioLoss = this.totalExposure * Math.abs(scenario.priceChange)
    }

    // Simular impacto en liquidez
    if (scenario.volumeChange) {
      simulation.results.liquidityImpact = Math.abs(scenario.volumeChange)
    }

    // Calcular score de riesgo del escenario
    simulation.results.riskScore = this.calculateScenarioRisk(scenario)

    // Generar recomendaciones
    simulation.recommendations = this.generateStressTestRecommendations(simulation)

    return simulation
  }

  calculateScenarioRisk(scenario) {
    let riskScore = 0

    if (scenario.priceChange && Math.abs(scenario.priceChange) > 0.1) {
      riskScore += 0.4
    }

    if (scenario.volatilityMultiplier && scenario.volatilityMultiplier > 2) {
      riskScore += 0.3
    }

    if (scenario.volumeChange && scenario.volumeChange < -0.5) {
      riskScore += 0.3
    }

    return Math.min(1.0, riskScore)
  }

  generateStressTestRecommendations(simulation) {
    const recommendations = []

    if (simulation.results.portfolioLoss > this.totalExposure * 0.1) {
      recommendations.push('Reducir exposición total')
      recommendations.push('Implementar hedging')
    }

    if (simulation.results.liquidityImpact > 0.5) {
      recommendations.push('Diversificar exchanges')
      recommendations.push('Monitorear volúmenes más de cerca')
    }

    if (simulation.results.riskScore > 0.7) {
      recommendations.push('Pausar trading automático')
      recommendations.push('Revisar límites de riesgo')
    }

    return recommendations
  }

  // Métodos auxiliares
  getHistoricalVolatility(pair) {
    const history = this.volatilityHistory.get(pair) || []
    if (history.length === 0) return 0.02 // 2% por defecto
    
    return history.reduce((sum, vol) => sum + vol, 0) / history.length
  }

  getVolatilityChange(pair) {
    const history = this.volatilityHistory.get(pair) || []
    if (history.length < 2) return 0
    
    return history[history.length - 1] - history[history.length - 2]
  }

  getCorrelatedPairs(pair) {
    // Simplificado - en producción usar matriz de correlación real
    const correlations = {
      'POL/USDT': ['MATIC/USDT'],
      'BTC/USDT': ['ETH/USDT'],
      'ETH/USDT': ['BTC/USDT'],
    }
    
    return correlations[pair] || []
  }

  isHighVolatilityPeriod() {
    // Simplificado - en producción usar indicadores de mercado reales
    return Math.random() < 0.1 // 10% probabilidad
  }

  updateExposure(pair, amount, isClosing = false) {
    const currentExposure = this.exposureMap.get(pair) || 0
    
    if (isClosing) {
      const newExposure = Math.max(0, currentExposure - amount)
      this.exposureMap.set(pair, newExposure)
      this.totalExposure = Math.max(0, this.totalExposure - amount)
    } else {
      this.exposureMap.set(pair, currentExposure + amount)
      this.totalExposure += amount
    }
  }

  trackVolatility(pair, volatility) {
    if (!this.volatilityHistory.has(pair)) {
      this.volatilityHistory.set(pair, [])
    }
    
    const history = this.volatilityHistory.get(pair)
    history.push(volatility)
    
    // Mantener solo los últimos 100 puntos
    if (history.length > 100) {
      history.shift()
    }
  }

  getRiskReport() {
    return {
      totalExposure: this.totalExposure,
      exposureByPair: Object.fromEntries(this.exposureMap),
      riskLimits: this.riskLimits,
      stressTestResults: this.stressTestResults.slice(-5), // Últimos 5 tests
      riskMetrics: Object.fromEntries(this.riskMetrics),
      recommendations: this.generatePortfolioRiskRecommendations(),
    }
  }

  generatePortfolioRiskRecommendations() {
    const recommendations = []
    
    // Verificar exposición total
    if (this.totalExposure > 1000) { // Ejemplo: $1000
      recommendations.push({
        type: 'EXPOSURE',
        message: 'Exposición total elevada',
        priority: 'MEDIUM',
      })
    }

    // Verificar concentración
    for (const [pair, exposure] of this.exposureMap.entries()) {
      if (exposure > this.totalExposure * 0.4) {
        recommendations.push({
          type: 'CONCENTRATION',
          message: `Alta concentración en ${pair}`,
          priority: 'HIGH',
        })
      }
    }

    return recommendations
  }
}

// Detector de anomalías auxiliar
class AnomalyDetector {
  constructor() {
    this.priceHistory = new Map()
    this.volumeHistory = new Map()
    this.spreadHistory = new Map()
  }

  detectAnomalies(pair, price, volume, spread) {
    const anomalies = []
    
    // Detectar anomalías de precio
    const priceAnomaly = this.detectPriceAnomaly(pair, price)
    if (priceAnomaly) anomalies.push(priceAnomaly)
    
    // Detectar anomalías de volumen
    const volumeAnomaly = this.detectVolumeAnomaly(pair, volume)
    if (volumeAnomaly) anomalies.push(volumeAnomaly)
    
    // Detectar anomalías de spread
    const spreadAnomaly = this.detectSpreadAnomaly(pair, spread)
    if (spreadAnomaly) anomalies.push(spreadAnomaly)
    
    // Actualizar historiales
    this.updateHistory(pair, price, volume, spread)
    
    return anomalies
  }

  detectPriceAnomaly(pair, price) {
    const history = this.priceHistory.get(pair) || []
    if (history.length < 10) return null
    
    const avg = history.reduce((a, b) => a + b) / history.length
    const deviation = Math.abs(price - avg) / avg
    
    if (deviation > 0.05) { // 5% desviación
      return {
        type: 'PRICE_ANOMALY',
        severity: deviation > 0.1 ? 'HIGH' : 'MEDIUM',
        message: `Precio anómalo: ${(deviation * 100).toFixed(1)}% desviación`,
      }
    }
    
    return null
  }

  detectVolumeAnomaly(pair, volume) {
    const history = this.volumeHistory.get(pair) || []
    if (history.length < 10) return null
    
    const avg = history.reduce((a, b) => a + b) / history.length
    const ratio = volume / avg
    
    if (ratio < 0.1 || ratio > 10) {
      return {
        type: 'VOLUME_ANOMALY',
        severity: ratio < 0.05 || ratio > 20 ? 'HIGH' : 'MEDIUM',
        message: `Volumen anómalo: ${ratio.toFixed(1)}x del promedio`,
      }
    }
    
    return null
  }

  detectSpreadAnomaly(pair, spread) {
    const history = this.spreadHistory.get(pair) || []
    if (history.length < 10) return null
    
    const avg = history.reduce((a, b) => a + b) / history.length
    const ratio = spread / avg
    
    if (ratio > 3) {
      return {
        type: 'SPREAD_ANOMALY',
        severity: ratio > 5 ? 'HIGH' : 'MEDIUM',
        message: `Spread anómalo: ${ratio.toFixed(1)}x del promedio`,
      }
    }
    
    return null
  }

  updateHistory(pair, price, volume, spread) {
    // Actualizar historial de precios
    if (!this.priceHistory.has(pair)) {
      this.priceHistory.set(pair, [])
    }
    const priceHist = this.priceHistory.get(pair)
    priceHist.push(price)
    if (priceHist.length > 50) priceHist.shift()
    
    // Actualizar historial de volumen
    if (!this.volumeHistory.has(pair)) {
      this.volumeHistory.set(pair, [])
    }
    const volumeHist = this.volumeHistory.get(pair)
    volumeHist.push(volume)
    if (volumeHist.length > 50) volumeHist.shift()
    
    // Actualizar historial de spread
    if (!this.spreadHistory.has(pair)) {
      this.spreadHistory.set(pair, [])
    }
    const spreadHist = this.spreadHistory.get(pair)
    spreadHist.push(spread)
    if (spreadHist.length > 50) spreadHist.shift()
  }
}

module.exports = {
  AdvancedRiskManager
}