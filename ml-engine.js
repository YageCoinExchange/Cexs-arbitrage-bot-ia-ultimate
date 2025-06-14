// ========== MOTOR DE MACHINE LEARNING AVANZADO ==========
const fs = require('fs').promises
const path = require('path')
const config = require("../strategies/config")

class MLEngine {
  constructor() {
    this.models = new Map()
    this.trainingData = []
    this.predictions = []
    this.modelAccuracy = new Map()
    this.featureImportance = new Map()
    this.lastTraining = 0
    this.minTrainingInterval = 3600000 // 1 hora
    
    this.initializeModels()
  }

  initializeModels() {
    // Modelo de predicción de precios
    this.models.set('PRICE_PREDICTION', {
      name: 'Predicción de Precios',
      type: 'REGRESSION',
      features: ['price', 'volume', 'rsi', 'macd', 'bollinger_position'],
      accuracy: 0.0,
      predictions: 0,
      correct: 0,
      lastTrained: 0,
    })

    // Modelo de detección de oportunidades
    this.models.set('OPPORTUNITY_DETECTION', {
      name: 'Detección de Oportunidades',
      type: 'CLASSIFICATION',
      features: ['spread', 'volume_ratio', 'price_volatility', 'market_sentiment'],
      accuracy: 0.0,
      predictions: 0,
      correct: 0,
      lastTrained: 0,
    })

    // Modelo de gestión de riesgo
    this.models.set('RISK_ASSESSMENT', {
      name: 'Evaluación de Riesgo',
      type: 'CLASSIFICATION',
      features: ['volatility', 'correlation', 'market_cap', 'liquidity'],
      accuracy: 0.0,
      predictions: 0,
      correct: 0,
      lastTrained: 0,
    })

    console.log('🤖 Modelos de ML inicializados:', Array.from(this.models.keys()))
  }

  async collectTrainingData(marketData, opportunity, result) {
    const features = this.extractFeatures(marketData, opportunity)
    
    const trainingPoint = {
      timestamp: Date.now(),
      features,
      opportunity,
      result,
      profit: result.profit || 0,
      success: result.success || false,
      executionTime: result.executionTime || 0,
    }

    this.trainingData.push(trainingPoint)

    // Mantener solo los últimos 10,000 puntos de datos
    if (this.trainingData.length > 10000) {
      this.trainingData = this.trainingData.slice(-10000)
    }

    // Entrenar modelos periódicamente
    if (this.shouldRetrain()) {
      await this.retrainModels()
    }
  }

  extractFeatures(marketData, opportunity) {
    return {
      // Características de precio
      price: opportunity.buyPrice,
      priceChange24h: marketData.priceChange24h || 0,
      volume24h: marketData.volume24h || 0,
      
      // Características técnicas
      rsi: this.calculateRSI(marketData.prices || []),
      macd: this.calculateMACD(marketData.prices || []),
      bollingerPosition: this.calculateBollingerPosition(marketData.prices || []),
      
      // Características de oportunidad
      spread: opportunity.finalProfit,
      volumeRatio: this.calculateVolumeRatio(marketData),
      priceVolatility: this.calculateVolatility(marketData.prices || []),
      
      // Características de mercado
      marketSentiment: this.calculateMarketSentiment(marketData),
      liquidity: marketData.liquidity || 0,
      correlation: this.calculateCorrelation(marketData),
      
      // Características temporales
      hourOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      isWeekend: [0, 6].includes(new Date().getDay()),
    }
  }

  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return 50

    let gains = 0
    let losses = 0

    for (let i = 1; i <= period; i++) {
      const change = prices[prices.length - i] - prices[prices.length - i - 1]
      if (change > 0) gains += change
      else losses += Math.abs(change)
    }

    const avgGain = gains / period
    const avgLoss = losses / period
    
    if (avgLoss === 0) return 100
    
    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }

  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26) {
    if (prices.length < slowPeriod) return 0

    const fastEMA = this.calculateEMA(prices, fastPeriod)
    const slowEMA = this.calculateEMA(prices, slowPeriod)
    
    return fastEMA - slowEMA
  }

  calculateEMA(prices, period) {
    if (prices.length === 0) return 0
    
    const multiplier = 2 / (period + 1)
    let ema = prices[0]
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier))
    }
    
    return ema
  }

  calculateBollingerPosition(prices, period = 20) {
    if (prices.length < period) return 0.5

    const recentPrices = prices.slice(-period)
    const sma = recentPrices.reduce((a, b) => a + b) / period
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period
    const stdDev = Math.sqrt(variance)
    
    const currentPrice = prices[prices.length - 1]
    const upperBand = sma + (2 * stdDev)
    const lowerBand = sma - (2 * stdDev)
    
    // Posición entre 0 (banda inferior) y 1 (banda superior)
    return (currentPrice - lowerBand) / (upperBand - lowerBand)
  }

  calculateVolumeRatio(marketData) {
    const currentVolume = marketData.volume24h || 0
    const avgVolume = marketData.avgVolume || currentVolume
    return avgVolume > 0 ? currentVolume / avgVolume : 1
  }

  calculateVolatility(prices, period = 20) {
    if (prices.length < period) return 0

    const recentPrices = prices.slice(-period)
    const returns = []
    
    for (let i = 1; i < recentPrices.length; i++) {
      returns.push((recentPrices[i] - recentPrices[i-1]) / recentPrices[i-1])
    }
    
    const avgReturn = returns.reduce((a, b) => a + b) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
    
    return Math.sqrt(variance) * Math.sqrt(365) // Volatilidad anualizada
  }

  calculateMarketSentiment(marketData) {
    // Sentimiento simplificado basado en varios factores
    let sentiment = 0.5 // Neutral

    // Ajustar por cambio de precio
    if (marketData.priceChange24h > 0) sentiment += 0.1
    else if (marketData.priceChange24h < 0) sentiment -= 0.1

    // Ajustar por volumen
    const volumeRatio = this.calculateVolumeRatio(marketData)
    if (volumeRatio > 1.2) sentiment += 0.1
    else if (volumeRatio < 0.8) sentiment -= 0.1

    return Math.max(0, Math.min(1, sentiment))
  }

  calculateCorrelation(marketData) {
    // Correlación simplificada - en producción usar datos reales de múltiples activos
    return marketData.correlation || 0.5
  }

  shouldRetrain() {
    const now = Date.now()
    const hasEnoughData = this.trainingData.length >= 100
    const timeToRetrain = now - this.lastTraining > this.minTrainingInterval
    
    return hasEnoughData && timeToRetrain
  }

  async retrainModels() {
    console.log('🔄 Reentrenando modelos de ML...')
    
    try {
      for (const [modelName, model] of this.models.entries()) {
        await this.trainModel(modelName, model)
      }
      
      this.lastTraining = Date.now()
      console.log('✅ Modelos reentrenados exitosamente')
      
      // Guardar modelos entrenados
      await this.saveModels()
      
    } catch (error) {
      console.error('❌ Error reentrenando modelos:', error)
    }
  }

  async trainModel(modelName, model) {
    // Preparar datos de entrenamiento
    const trainingSet = this.prepareTrainingData(model)
    
    if (trainingSet.length < 50) {
      console.log(`⚠️ Datos insuficientes para entrenar ${modelName}`)
      return
    }

    // Simulación de entrenamiento (en producción usar TensorFlow.js o similar)
    const accuracy = this.simulateTraining(trainingSet, model)
    
    // Actualizar métricas del modelo
    model.accuracy = accuracy
    model.lastTrained = Date.now()
    
    console.log(`📊 Modelo ${modelName} entrenado - Precisión: ${(accuracy * 100).toFixed(2)}%`)
  }

  prepareTrainingData(model) {
    return this.trainingData
      .filter(point => point.features && point.result)
      .map(point => ({
        features: model.features.map(feature => point.features[feature] || 0),
        target: this.getTarget(point, model.type),
      }))
  }

  getTarget(dataPoint, modelType) {
    switch (modelType) {
      case 'REGRESSION':
        return dataPoint.profit || 0
      case 'CLASSIFICATION':
        return dataPoint.success ? 1 : 0
      default:
        return 0
    }
  }

  simulateTraining(trainingSet, model) {
    // Simulación simple de entrenamiento
    // En producción, aquí iría el algoritmo real de ML
    
    const correctPredictions = trainingSet.filter(point => {
      const prediction = this.makeSimplePrediction(point.features, model)
      const actual = point.target
      
      if (model.type === 'CLASSIFICATION') {
        return (prediction > 0.5 && actual === 1) || (prediction <= 0.5 && actual === 0)
      } else {
        return Math.abs(prediction - actual) < Math.abs(actual) * 0.1 // 10% de tolerancia
      }
    }).length

    return correctPredictions / trainingSet.length
  }

  makeSimplePrediction(features, model) {
    // Predicción simple basada en pesos aleatorios
    // En producción usar modelo entrenado real
    
    const weights = model.weights || features.map(() => Math.random() - 0.5)
    if (!model.weights) model.weights = weights
    
    let prediction = 0
    for (let i = 0; i < features.length; i++) {
      prediction += features[i] * weights[i]
    }
    
    return model.type === 'CLASSIFICATION' ? this.sigmoid(prediction) : prediction
  }

  sigmoid(x) {
    return 1 / (1 + Math.exp(-x))
  }

  async predictOpportunitySuccess(opportunity, marketData) {
    const features = this.extractFeatures(marketData, opportunity)
    const model = this.models.get('OPPORTUNITY_DETECTION')
    
    if (!model || model.accuracy < 0.6) {
      return { confidence: 0.5, prediction: 'UNCERTAIN', reason: 'Modelo no entrenado suficientemente' }
    }

    const featureVector = model.features.map(feature => features[feature] || 0)
    const prediction = this.makeSimplePrediction(featureVector, model)
    
    // Actualizar estadísticas del modelo
    model.predictions++
    
    return {
      confidence: prediction,
      prediction: prediction > 0.7 ? 'SUCCESS' : prediction < 0.3 ? 'FAILURE' : 'UNCERTAIN',
      reason: this.explainPrediction(featureVector, model),
      modelAccuracy: model.accuracy,
    }
  }

  async predictPriceMovement(pair, marketData, timeframe = '1h') {
    const features = this.extractFeatures(marketData, { pair })
    const model = this.models.get('PRICE_PREDICTION')
    
    if (!model || model.accuracy < 0.6) {
      return { direction: 'NEUTRAL', confidence: 0.5, change: 0 }
    }

    const featureVector = model.features.map(feature => features[feature] || 0)
    const prediction = this.makeSimplePrediction(featureVector, model)
    
    return {
      direction: prediction > 0.01 ? 'UP' : prediction < -0.01 ? 'DOWN' : 'NEUTRAL',
      confidence: Math.abs(prediction),
      change: prediction,
      timeframe,
    }
  }

  async assessRisk(opportunity, marketData) {
    const features = this.extractFeatures(marketData, opportunity)
    const model = this.models.get('RISK_ASSESSMENT')
    
    if (!model || model.accuracy < 0.6) {
      return { risk: 'MEDIUM', confidence: 0.5, factors: [] }
    }

    const featureVector = model.features.map(feature => features[feature] || 0)
    const riskScore = this.makeSimplePrediction(featureVector, model)
    
    const riskLevel = riskScore > 0.7 ? 'HIGH' : riskScore < 0.3 ? 'LOW' : 'MEDIUM'
    
    return {
      risk: riskLevel,
      score: riskScore,
      confidence: model.accuracy,
      factors: this.identifyRiskFactors(features),
    }
  }

  explainPrediction(features, model) {
    const weights = model.weights || []
    const contributions = features.map((feature, i) => ({
      feature: model.features[i],
      value: feature,
      weight: weights[i] || 0,
      contribution: feature * (weights[i] || 0),
    }))

    contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    
    const topFactors = contributions.slice(0, 3)
    return `Factores principales: ${topFactors.map(f => f.feature).join(', ')}`
  }

  identifyRiskFactors(features) {
    const factors = []
    
    if (features.priceVolatility > 0.3) factors.push('Alta volatilidad')
    if (features.volumeRatio < 0.5) factors.push('Volumen bajo')
    if (features.rsi > 80) factors.push('Sobrecompra (RSI)')
    if (features.rsi < 20) factors.push('Sobreventa (RSI)')
    if (features.spread < 0.2) factors.push('Spread muy bajo')
    
    return factors
  }

  async saveModels() {
    try {
      const modelsData = {
        models: Object.fromEntries(this.models),
        lastTraining: this.lastTraining,
        trainingDataCount: this.trainingData.length,
      }
      
      const modelsPath = path.join(__dirname, 'models.json')
      await fs.writeFile(modelsPath, JSON.stringify(modelsData, null, 2))
      
      console.log('💾 Modelos guardados exitosamente')
    } catch (error) {
      console.error('❌ Error guardando modelos:', error)
    }
  }

  async loadModels() {
    try {
      const modelsPath = path.join(__dirname, 'models.json')
      const data = await fs.readFile(modelsPath, 'utf8')
      const modelsData = JSON.parse(data)
      
      this.models = new Map(Object.entries(modelsData.models))
      this.lastTraining = modelsData.lastTraining || 0
      
      console.log('📂 Modelos cargados exitosamente')
    } catch (error) {
      console.log('ℹ️ No se encontraron modelos guardados, usando configuración por defecto')
    }
  }

  getModelStats() {
    const stats = {}
    
    for (const [name, model] of this.models.entries()) {
      stats[name] = {
        name: model.name,
        type: model.type,
        accuracy: model.accuracy,
        predictions: model.predictions,
        lastTrained: model.lastTrained,
        features: model.features.length,
      }
    }
    
    return {
      models: stats,
      trainingDataPoints: this.trainingData.length,
      lastTraining: this.lastTraining,
      nextTraining: this.lastTraining + this.minTrainingInterval,
    }
  }
}

module.exports = { MLEngine }