const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

/**
 * Motor de Backtesting
 * Permite probar estrategias con datos históricos
 */
class BacktestEngine extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.enabled = config.BACKTESTING.ENABLED;
        this.dataSource = config.BACKTESTING.DATA_SOURCE;
        this.defaultPeriod = config.BACKTESTING.DEFAULT_PERIOD;
        this.commissionRate = config.BACKTESTING.COMMISSION_RATE;
        this.slippageRate = config.BACKTESTING.SLIPPAGE_RATE;
        this.initialCapital = config.BACKTESTING.INITIAL_CAPITAL;
        this.benchmark = config.BACKTESTING.BENCHMARK;
        this.metrics = config.BACKTESTING.METRICS;
        this.monteCarloSimulations = config.BACKTESTING.MONTE_CARLO_SIMULATIONS;
        this.confidenceIntervals = config.BACKTESTING.CONFIDENCE_INTERVALS;
        
        this.historicalData = {};
        this.backtestResults = {};
        this.currentBacktest = null;
        
        this.logger = console;
    }
    
    /**
     * Inicializa el motor de backtesting
     */
    async initialize() {
        if (!this.enabled) {
            this.logger.info('Backtesting deshabilitado');
            return;
        }
        
        this.logger.info('Inicializando motor de backtesting...');
        
        try {
            // Crear directorio de datos si no existe
            await this.ensureDataDirectory();
            
            // Cargar datos históricos iniciales
            await this.loadInitialData();
            
            this.logger.info('Motor de backtesting inicializado correctamente');
        } catch (error) {
            this.logger.error('Error inicializando motor de backtesting:', error);
            throw error;
        }
    }
    
    /**
     * Asegura que el directorio de datos exista
     */
    async ensureDataDirectory() {
        const dataDir = path.join(__dirname, 'data');
        try {
            await fs.mkdir(dataDir, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }
    
    /**
     * Carga datos históricos iniciales
     */
    async loadInitialData() {
        try {
            // En una implementación real, aquí cargaríamos datos históricos de una API o archivos
            // Para esta implementación, generaremos datos simulados
            
            const pairs = this.config.TRADING_PAIRS;
            const exchanges = Object.keys(this.config.EXCHANGES)
                .filter(key => this.config.EXCHANGES[key].enabled)
                .map(key => this.config.EXCHANGES[key].name);
            
            for (const pair of pairs) {
                this.historicalData[pair] = {};
                
                for (const exchange of exchanges) {
                    this.historicalData[pair][exchange] = await this.generateHistoricalData(pair, exchange);
                }
            }
            
            this.logger.info(`Datos históricos cargados para ${pairs.length} pares en ${exchanges.length} exchanges`);
        } catch (error) {
            this.logger.error('Error cargando datos históricos:', error);
            throw error;
        }
    }
    
    /**
     * Genera datos históricos simulados
     * @param {string} pair - Par de trading
     * @param {string} exchange - Exchange
     * @returns {Array} - Datos históricos simulados
     */
    async generateHistoricalData(pair, exchange) {
        const days = this.defaultPeriod;
        const dataPoints = days * 24 * 6; // 6 puntos por hora
        const endDate = new Date();
        const data = [];
        
        // Generar precio base según el par
        let basePrice;
        if (pair.includes('BTC')) {
            basePrice = 30000 + Math.random() * 10000;
        } else if (pair.includes('ETH')) {
            basePrice = 2000 + Math.random() * 500;
        } else if (pair.includes('XRP')) {
            basePrice = 0.5 + Math.random() * 0.2;
        } else {
            basePrice = 10 + Math.random() * 90;
        }
        
        // Añadir variación por exchange
        if (exchange === 'Binance') {
            basePrice *= 1.0;
        } else if (exchange === 'Coinbase') {
            basePrice *= 1.005;
        } else if (exchange === 'Kraken') {
            basePrice *= 0.995;
        } else {
            basePrice *= 1.002;
        }
        
        // Generar serie temporal
        let currentPrice = basePrice;
        for (let i = 0; i < dataPoints; i++) {
            const timestamp = new Date(endDate.getTime() - (dataPoints - i) * 10 * 60 * 1000); // 10 minutos
            
            // Simular movimiento de precio
            const change = (Math.random() - 0.5) * 0.01; // ±0.5%
            currentPrice = currentPrice * (1 + change);
            
            // Añadir algo de volatilidad según el par
            if (pair.includes('BTC')) {
                currentPrice += (Math.random() - 0.5) * 50;
            } else if (pair.includes('ETH')) {
                currentPrice += (Math.random() - 0.5) * 10;
            } else {
                currentPrice += (Math.random() - 0.5) * 0.05;
            }
            
            // Asegurar que el precio no sea negativo
            currentPrice = Math.max(currentPrice, 0.001);
            
            // Generar volumen simulado
            let volume;
            if (pair.includes('BTC')) {
                volume = Math.random() * 10 + 1;
            } else if (pair.includes('ETH')) {
                volume = Math.random() * 50 + 5;
            } else {
                volume = Math.random() * 100000 + 10000;
            }
            
            // Añadir datos
            data.push({
                timestamp: timestamp.toISOString(),
                open: currentPrice * (1 - 0.001),
                high: currentPrice * (1 + 0.002),
                low: currentPrice * (1 - 0.002),
                close: currentPrice,
                volume: volume,
                exchange
            });
        }
        
        return data;
    }
    
    /**
     * Ejecuta un backtest con una estrategia específica
     * @param {Object} options - Opciones del backtest
     * @returns {Object} - Resultados del backtest
     */
    async runBacktest(options) {
        if (!this.enabled) {
            throw new Error('Backtesting está deshabilitado');
        }
        
        const {
            strategy = 'basic',
            pairs = this.config.TRADING_PAIRS,
            exchanges = Object.keys(this.config.EXCHANGES)
                .filter(key => this.config.EXCHANGES[key].enabled)
                .map(key => this.config.EXCHANGES[key].name),
            startDate = new Date(Date.now() - this.defaultPeriod * 24 * 60 * 60 * 1000),
            endDate = new Date(),
            initialCapital = this.initialCapital,
            parameters = {}
        } = options;
        
        this.logger.info(`Iniciando backtest para estrategia ${strategy}...`);
        
        try {
            // Crear ID único para este backtest
            const backtestId = `backtest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Inicializar estado del backtest
            this.currentBacktest = {
                id: backtestId,
                strategy,
                pairs,
                exchanges,
                startDate,
                endDate,
                initialCapital,
                parameters,
                status: 'running',
                progress: 0,
                trades: [],
                balance: initialCapital,
                equity: initialCapital,
                startTime: new Date()
            };
            
            // Emitir evento de inicio
            this.emit('backtestStarted', { id: backtestId });
            
            // Filtrar datos históricos según fechas y pares/exchanges
            const filteredData = await this.filterHistoricalData(pairs, exchanges, startDate, endDate);
            
            // Ejecutar simulación
            const result = await this.simulateStrategy(strategy, filteredData, initialCapital, parameters);
            
            // Calcular métricas
            const metrics = this.calculateMetrics(result);
            
            // Ejecutar simulaciones de Monte Carlo
            const monteCarloResults = await this.runMonteCarloSimulations(result);
            
            // Guardar resultados
            this.backtestResults[backtestId] = {
                ...this.currentBacktest,
                status: 'completed',
                progress: 100,
                result,
                metrics,
                monteCarloResults,
                endTime: new Date(),
                executionTime: new Date() - this.currentBacktest.startTime
            };
            
            // Emitir evento de finalización
            this.emit('backtestCompleted', { 
                id: backtestId,
                metrics,
                executionTime: this.backtestResults[backtestId].executionTime
            });
            
            this.currentBacktest = null;
            
            return this.backtestResults[backtestId];
        } catch (error) {
            this.logger.error('Error ejecutando backtest:', error);
            
            if (this.currentBacktest) {
                this.backtestResults[this.currentBacktest.id] = {
                    ...this.currentBacktest,
                    status: 'failed',
                    error: error.message,
                    endTime: new Date(),
                    executionTime: new Date() - this.currentBacktest.startTime
                };
                
                // Emitir evento de error
                this.emit('backtestError', { 
                    id: this.currentBacktest.id,
                    error: error.message
                });
                
                this.currentBacktest = null;
            }
            
            throw error;
        }
    }
    
    /**
     * Filtra datos históricos según criterios
     * @param {Array} pairs - Pares de trading
     * @param {Array} exchanges - Exchanges
     * @param {Date} startDate - Fecha de inicio
     * @param {Date} endDate - Fecha de fin
     * @returns {Object} - Datos históricos filtrados
     */
    async filterHistoricalData(pairs, exchanges, startDate, endDate) {
        const filteredData = {};
        
        for (const pair of pairs) {
            if (!this.historicalData[pair]) continue;
            
            filteredData[pair] = {};
            
            for (const exchange of exchanges) {
                if (!this.historicalData[pair][exchange]) continue;
                
                // Filtrar por fecha
                filteredData[pair][exchange] = this.historicalData[pair][exchange].filter(data => {
                    const timestamp = new Date(data.timestamp);
                    return timestamp >= startDate && timestamp <= endDate;
                });
            }
        }
        
        return filteredData;
    }
    
    /**
     * Simula una estrategia con datos históricos
     * @param {string} strategyName - Nombre de la estrategia
     * @param {Object} data - Datos históricos
     * @param {number} initialCapital - Capital inicial
     * @param {Object} parameters - Parámetros de la estrategia
     * @returns {Object} - Resultados de la simulación
     */
    async simulateStrategy(strategyName, data, initialCapital, parameters) {
        // Obtener configuración de la estrategia
        const strategyConfig = this.config.STRATEGIES[strategyName.toUpperCase()] || this.config.STRATEGIES.BASIC;
        
        // Inicializar resultado
        const result = {
            trades: [],
            balanceHistory: [],
            equityHistory: [],
            positions: {},
            currentBalance: initialCapital,
            maxBalance: initialCapital,
            minBalance: initialCapital,
            finalBalance: initialCapital,
            totalTrades: 0,
            successfulTrades: 0,
            failedTrades: 0,
            totalProfit: 0,
            totalLoss: 0,
            netProfit: 0,
            winRate: 0,
            maxDrawdown: 0,
            maxDrawdownPercentage: 0
        };
        
        // Ordenar todos los datos por timestamp
        const allDataPoints = [];
        
        for (const pair in data) {
            for (const exchange in data[pair]) {
                for (const point of data[pair][exchange]) {
                    allDataPoints.push({
                        ...point,
                        pair,
                        exchange
                    });
                }
            }
        }
        
        // Ordenar por timestamp
        allDataPoints.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Inicializar balance histórico
        result.balanceHistory.push({
            timestamp: allDataPoints[0]?.timestamp || new Date().toISOString(),
            balance: initialCapital
        });
        
        result.equityHistory.push({
            timestamp: allDataPoints[0]?.timestamp || new Date().toISOString(),
            equity: initialCapital
        });
        
        // Simular trading
        let lastProgressUpdate = 0;
        
        for (let i = 0; i < allDataPoints.length; i++) {
            // Actualizar progreso cada 5%
            const progress = Math.floor((i / allDataPoints.length) * 100);
            if (progress >= lastProgressUpdate + 5) {
                lastProgressUpdate = progress;
                if (this.currentBacktest) {
                    this.currentBacktest.progress = progress;
                    this.emit('backtestProgress', { 
                        id: this.currentBacktest.id,
                        progress
                    });
                }
            }
            
            const currentPoint = allDataPoints[i];
            const { pair, exchange, timestamp, close: price } = currentPoint;
            
            // Buscar oportunidades de arbitraje
            const opportunities = await this.findArbitrageOpportunities(allDataPoints, i, strategyName, strategyConfig);
            
            // Ejecutar operaciones para oportunidades encontradas
            for (const opportunity of opportunities) {
                const trade = await this.executeTrade(opportunity, result.currentBalance, timestamp);
                
                if (trade) {
                    // Actualizar balance
                    result.currentBalance += trade.profit;
                    
                    // Actualizar estadísticas
                    result.totalTrades++;
                    if (trade.profit > 0) {
                        result.successfulTrades++;
                        result.totalProfit += trade.profit;
                    } else {
                        result.failedTrades++;
                        result.totalLoss += trade.profit; // Será negativo
                    }
                    
                    // Actualizar máximo y mínimo balance
                    result.maxBalance = Math.max(result.maxBalance, result.currentBalance);
                    result.minBalance = Math.min(result.minBalance, result.currentBalance);
                    
                    // Registrar operación
                    result.trades.push(trade);
                }
            }
            
            // Actualizar historial de balance cada hora simulada
            if (i % 6 === 0) { // Asumiendo 6 puntos por hora
                result.balanceHistory.push({
                    timestamp,
                    balance: result.currentBalance
                });
                
                // Calcular equity (balance + valor de posiciones abiertas)
                let equity = result.currentBalance;
                
                // Añadir valor de posiciones abiertas (si las hubiera)
                for (const positionPair in result.positions) {
                    for (const positionExchange in result.positions[positionPair]) {
                        const position = result.positions[positionPair][positionExchange];
                        // En este ejemplo simplificado no manejamos posiciones abiertas
                    }
                }
                
                result.equityHistory.push({
                    timestamp,
                    equity
                });
            }
        }
        
        // Finalizar resultado
        result.finalBalance = result.currentBalance;
        result.netProfit = result.totalProfit + result.totalLoss;
        result.winRate = result.totalTrades > 0 ? result.successfulTrades / result.totalTrades : 0;
        
        // Calcular drawdown
        let peak = initialCapital;
        let maxDrawdown = 0;
        let maxDrawdownPercentage = 0;
        
        for (const point of result.balanceHistory) {
            if (point.balance > peak) {
                peak = point.balance;
            } else {
                const drawdown = peak - point.balance;
                const drawdownPercentage = drawdown / peak;
                
                if (drawdown > maxDrawdown) {
                    maxDrawdown = drawdown;
                    maxDrawdownPercentage = drawdownPercentage;
                }
            }
        }
        
        result.maxDrawdown = maxDrawdown;
        result.maxDrawdownPercentage = maxDrawdownPercentage;
        
        return result;
    }
    
    /**
     * Busca oportunidades de arbitraje en datos históricos
     * @param {Array} dataPoints - Puntos de datos históricos
     * @param {number} currentIndex - Índice actual
     * @param {string} strategyName - Nombre de la estrategia
     * @param {Object} strategyConfig - Configuración de la estrategia
     * @returns {Array} - Oportunidades encontradas
     */
    async findArbitrageOpportunities(dataPoints, currentIndex, strategyName, strategyConfig) {
        const opportunities = [];
        const currentPoint = dataPoints[currentIndex];
        const { timestamp } = currentPoint;
        
        // Obtener precios actuales para todos los pares y exchanges
        const currentPrices = {};
        
        // Buscar en un rango cercano al punto actual (simulando datos simultáneos)
        const rangeStart = Math.max(0, currentIndex - 10);
        const rangeEnd = Math.min(dataPoints.length - 1, currentIndex + 10);
        
        for (let i = rangeStart; i <= rangeEnd; i++) {
            const point = dataPoints[i];
            const { pair, exchange, close: price } = point;
            
            if (!currentPrices[pair]) {
                currentPrices[pair] = {};
            }
            
            currentPrices[pair][exchange] = price;
        }
        
        // Buscar oportunidades según la estrategia
        switch (strategyName.toLowerCase()) {
            case 'basic':
                return this.findBasicArbitrageOpportunities(currentPrices, timestamp, strategyConfig);
                
            case 'triangular':
                return this.findTriangularArbitrageOpportunities(currentPrices, timestamp, strategyConfig);
                
            case 'statistical':
                return this.findStatisticalArbitrageOpportunities(currentPrices, dataPoints, currentIndex, strategyConfig);
                
            case 'ml':
                return this.findMLArbitrageOpportunities(currentPrices, dataPoints, currentIndex, strategyConfig);
                
            case 'combined':
                // Combinar resultados de varias estrategias
                const basicOpps = await this.findBasicArbitrageOpportunities(currentPrices, timestamp, strategyConfig);
                const triangularOpps = await this.findTriangularArbitrageOpportunities(currentPrices, timestamp, strategyConfig);
                const statisticalOpps = await this.findStatisticalArbitrageOpportunities(currentPrices, dataPoints, currentIndex, strategyConfig);
                
                return [...basicOpps, ...triangularOpps, ...statisticalOpps];
                
            default:
                return this.findBasicArbitrageOpportunities(currentPrices, timestamp, strategyConfig);
        }
    }
    
    /**
     * Busca oportunidades de arbitraje básico
     * @param {Object} prices - Precios actuales
     * @param {string} timestamp - Timestamp actual
     * @param {Object} config - Configuración de la estrategia
     * @returns {Array} - Oportunidades encontradas
     */
    async findBasicArbitrageOpportunities(prices, timestamp, config) {
        const opportunities = [];
        const minProfitPercentage = config.minProfitPercentage || 0.2;
        
        for (const pair in prices) {
            const exchanges = Object.keys(prices[pair]);
            
            // Necesitamos al menos 2 exchanges para arbitraje
            if (exchanges.length < 2) continue;
            
            // Encontrar el exchange con el precio más bajo y más alto
            let lowestPrice = Infinity;
            let highestPrice = -Infinity;
            let buyExchange = null;
            let sellExchange = null;
            
            for (const exchange of exchanges) {
                const price = prices[pair][exchange];
                
                if (price < lowestPrice) {
                    lowestPrice = price;
                    buyExchange = exchange;
                }
                
                if (price > highestPrice) {
                    highestPrice = price;
                    sellExchange = exchange;
                }
            }
            
            // Calcular ganancia potencial
            const profitPercentage = ((highestPrice - lowestPrice) / lowestPrice) * 100;
            
            // Verificar si la ganancia supera el mínimo requerido
            if (profitPercentage >= minProfitPercentage && buyExchange !== sellExchange) {
                opportunities.push({
                    type: 'basic',
                    pair,
                    buyExchange,
                    sellExchange,
                    buyPrice: lowestPrice,
                    sellPrice: highestPrice,
                    profitPercentage,
                    timestamp
                });
            }
        }
        
        return opportunities;
    }
    
    /**
     * Busca oportunidades de arbitraje triangular
     * @param {Object} prices - Precios actuales
     * @param {string} timestamp - Timestamp actual
     * @param {Object} config - Configuración de la estrategia
     * @returns {Array} - Oportunidades encontradas
     */
    async findTriangularArbitrageOpportunities(prices, timestamp, config) {
        // En una implementación real, aquí buscaríamos oportunidades de arbitraje triangular
        // Para esta implementación, simularemos algunas oportunidades
        
        const opportunities = [];
        const minProfitPercentage = config.minProfitPercentage || 0.15;
        
        // Simular algunas oportunidades triangulares
        if (Math.random() < 0.05) { // 5% de probabilidad de encontrar una oportunidad
            const profitPercentage = minProfitPercentage + Math.random() * 0.5;
            
            // Elegir pares y exchanges aleatorios
            const availablePairs = Object.keys(prices);
            if (availablePairs.length < 2) return opportunities;
            
            const pair1 = availablePairs[Math.floor(Math.random() * availablePairs.length)];
            let pair2 = availablePairs[Math.floor(Math.random() * availablePairs.length)];
            while (pair2 === pair1) {
                pair2 = availablePairs[Math.floor(Math.random() * availablePairs.length)];
            }
            
            const availableExchanges = Object.keys(prices[pair1]);
            if (availableExchanges.length < 1) return opportunities;
            
            const exchange = availableExchanges[Math.floor(Math.random() * availableExchanges.length)];
            
            opportunities.push({
                type: 'triangular',
                pairs: [pair1, pair2],
                exchange,
                steps: [
                    { pair: pair1, action: 'buy', price: prices[pair1][exchange] || 1000 },
                    { pair: pair2, action: 'sell', price: prices[pair2][exchange] || 1000 }
                ],
                profitPercentage,
                timestamp
            });
        }
        
        return opportunities;
    }
    
    /**
     * Busca oportunidades de arbitraje estadístico
     * @param {Object} prices - Precios actuales
     * @param {Array} dataPoints - Puntos de datos históricos
     * @param {number} currentIndex - Índice actual
     * @param {Object} config - Configuración de la estrategia
     * @returns {Array} - Oportunidades encontradas
     */
    async findStatisticalArbitrageOpportunities(prices, dataPoints, currentIndex, config) {
        // En una implementación real, aquí buscaríamos oportunidades de arbitraje estadístico
        // Para esta implementación, simularemos algunas oportunidades
        
        const opportunities = [];
        const minProfitPercentage = config.minProfitPercentage || 0.1;
        const lookbackPeriod = config.lookbackPeriod || 100;
        const zScoreThreshold = config.zScoreThreshold || 2.0;
        
        // Simular algunas oportunidades estadísticas
        if (Math.random() < 0.03) { // 3% de probabilidad de encontrar una oportunidad
            const profitPercentage = minProfitPercentage + Math.random() * 0.3;
            
            // Elegir par y exchanges aleatorios
            const availablePairs = Object.keys(prices);
            if (availablePairs.length < 1) return opportunities;
            
            const pair = availablePairs[Math.floor(Math.random() * availablePairs.length)];
            
            const availableExchanges = Object.keys(prices[pair]);
            if (availableExchanges.length < 2) return opportunities;
            
            const exchange1 = availableExchanges[Math.floor(Math.random() * availableExchanges.length)];
            let exchange2 = availableExchanges[Math.floor(Math.random() * availableExchanges.length)];
            while (exchange2 === exchange1) {
                exchange2 = availableExchanges[Math.floor(Math.random() * availableExchanges.length)];
            }
            
            opportunities.push({
                type: 'statistical',
                pair,
                buyExchange: exchange1,
                sellExchange: exchange2,
                buyPrice: prices[pair][exchange1] || 1000,
                sellPrice: prices[pair][exchange2] || 1000,
                zScore: zScoreThreshold + Math.random(),
                profitPercentage,
                timestamp: dataPoints[currentIndex].timestamp
            });
        }
        
        return opportunities;
    }
    
    /**
     * Busca oportunidades de arbitraje con ML
     * @param {Object} prices - Precios actuales
     * @param {Array} dataPoints - Puntos de datos históricos
     * @param {number} currentIndex - Índice actual
     * @param {Object} config - Configuración de la estrategia
     * @returns {Array} - Oportunidades encontradas
     */
    async findMLArbitrageOpportunities(prices, dataPoints, currentIndex, config) {
        // En una implementación real, aquí usaríamos un modelo de ML para encontrar oportunidades
        // Para esta implementación, simularemos algunas oportunidades
        
        const opportunities = [];
        const confidenceThreshold = config.confidenceThreshold || 0.7;
        
        // Simular algunas oportunidades basadas en ML
        if (Math.random() < 0.02) { // 2% de probabilidad de encontrar una oportunidad
            const confidence = confidenceThreshold + Math.random() * (1 - confidenceThreshold);
            const profitPercentage = 0.1 + Math.random() * 0.4;
            
            // Elegir par y exchanges aleatorios
            const availablePairs = Object.keys(prices);
            if (availablePairs.length < 1) return opportunities;
            
            const pair = availablePairs[Math.floor(Math.random() * availablePairs.length)];
            
            const availableExchanges = Object.keys(prices[pair]);
            if (availableExchanges.length < 2) return opportunities;
            
            const exchange1 = availableExchanges[Math.floor(Math.random() * availableExchanges.length)];
            let exchange2 = availableExchanges[Math.floor(Math.random() * availableExchanges.length)];
            while (exchange2 === exchange1) {
                exchange2 = availableExchanges[Math.floor(Math.random() * availableExchanges.length)];
            }
            
            opportunities.push({
                type: 'ml',
                pair,
                buyExchange: exchange1,
                sellExchange: exchange2,
                buyPrice: prices[pair][exchange1] || 1000,
                sellPrice: prices[pair][exchange2] || 1000,
                confidence,
                profitPercentage,
                timestamp: dataPoints[currentIndex].timestamp
            });
        }
        
        return opportunities;
    }
    
    /**
     * Ejecuta una operación simulada
     * @param {Object} opportunity - Oportunidad de arbitraje
     * @param {number} balance - Balance actual
     * @param {string} timestamp - Timestamp actual
     * @returns {Object|null} - Detalles de la operación o null si no se ejecutó
     */
    async executeTrade(opportunity, balance, timestamp) {
        // Determinar cantidad a invertir (10% del balance)
        const investmentAmount = balance * 0.1;
        
        // Verificar si hay suficiente balance
        if (investmentAmount < 10) { // Mínimo $10
            return null;
        }
        
        // Calcular comisiones
        const buyCommission = investmentAmount * this.commissionRate;
        const sellCommission = (investmentAmount * (1 + opportunity.profitPercentage / 100)) * this.commissionRate;
        
        // Calcular slippage
        const buySlippage = investmentAmount * this.slippageRate;
        const sellSlippage = (investmentAmount * (1 + opportunity.profitPercentage / 100)) * this.slippageRate;
        
        // Calcular ganancia neta
        const grossProfit = investmentAmount * (opportunity.profitPercentage / 100);
        const netProfit = grossProfit - buyCommission - sellCommission - buySlippage - sellSlippage;
        
        // Simular éxito/fallo (95% éxito)
        const success = Math.random() > 0.05;
        
        // Si falla, perder una parte de la inversión
        const finalProfit = success ? netProfit : -investmentAmount * 0.02;
        
        return {
            timestamp,
            type: opportunity.type,
            pair: opportunity.pair || (opportunity.pairs ? opportunity.pairs[0] : 'unknown'),
            buyExchange: opportunity.buyExchange || opportunity.exchange || 'unknown',
            sellExchange: opportunity.sellExchange || opportunity.exchange || 'unknown',
            buyPrice: opportunity.buyPrice || 0,
            sellPrice: opportunity.sellPrice || 0,
            investmentAmount,
            grossProfit,
            fees: buyCommission + sellCommission,
            slippage: buySlippage + sellSlippage,
            netProfit,
            profit: finalProfit,
            profitPercentage: (finalProfit / investmentAmount) * 100,
            success
        };
    }
    
    /**
     * Calcula métricas de rendimiento
     * @param {Object} result - Resultados del backtest
     * @returns {Object} - Métricas calculadas
     */
    calculateMetrics(result) {
        const metrics = {};
        
        // Total Return
        metrics.totalReturn = ((result.finalBalance - this.initialCapital) / this.initialCapital) * 100;
        
        // Annualized Return (asumiendo 365 días por año)
        const days = result.balanceHistory.length > 1 ? 
            (new Date(result.balanceHistory[result.balanceHistory.length - 1].timestamp) - 
             new Date(result.balanceHistory[0].timestamp)) / (1000 * 60 * 60 * 24) : 1;
        
        metrics.annualizedReturn = ((1 + metrics.totalReturn / 100) ** (365 / days) - 1) * 100;
        
        // Sharpe Ratio (asumiendo tasa libre de riesgo del 2%)
        const riskFreeRate = 0.02;
        const returns = [];
        
        for (let i = 1; i < result.balanceHistory.length; i++) {
            const prevBalance = result.balanceHistory[i - 1].balance;
            const currentBalance = result.balanceHistory[i].balance;
            returns.push((currentBalance - prevBalance) / prevBalance);
        }
        
        const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const stdReturn = Math.sqrt(returns.reduce((sum, r) => sum + (r - avgReturn) ** 2, 0) / returns.length);
        
        metrics.sharpeRatio = stdReturn !== 0 ? 
            (avgReturn - riskFreeRate / 365) / stdReturn * Math.sqrt(365) : 0;
        
        // Max Drawdown
       metrics.maxDrawdown = result.maxDrawdown;
        metrics.maxDrawdownPercentage = result.maxDrawdownPercentage * 100;
        
        // Win Rate
        metrics.winRate = result.winRate * 100;
        
        // Profit Factor
        metrics.profitFactor = result.totalLoss !== 0 ? 
            Math.abs(result.totalProfit / result.totalLoss) : 
            (result.totalProfit > 0 ? Infinity : 0);
        
        // Calmar Ratio
        metrics.calmarRatio = metrics.maxDrawdownPercentage !== 0 ? 
            metrics.annualizedReturn / metrics.maxDrawdownPercentage : 0;
        
        // Average Trade
        metrics.averageTrade = result.totalTrades > 0 ? 
            result.netProfit / result.totalTrades : 0;
        
        // Best Trade
        metrics.bestTrade = result.trades.length > 0 ? 
            Math.max(...result.trades.map(t => t.profit)) : 0;
        
        // Worst Trade
        metrics.worstTrade = result.trades.length > 0 ? 
            Math.min(...result.trades.map(t => t.profit)) : 0;
        
        // Average Win
        const winningTrades = result.trades.filter(t => t.profit > 0);
        metrics.averageWin = winningTrades.length > 0 ? 
            winningTrades.reduce((sum, t) => sum + t.profit, 0) / winningTrades.length : 0;
        
        // Average Loss
        const losingTrades = result.trades.filter(t => t.profit < 0);
        metrics.averageLoss = losingTrades.length > 0 ? 
            losingTrades.reduce((sum, t) => sum + t.profit, 0) / losingTrades.length : 0;
        
        // Largest Winning Streak
        let currentWinStreak = 0;
        let maxWinStreak = 0;
        
        for (const trade of result.trades) {
            if (trade.profit > 0) {
                currentWinStreak++;
                maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
            } else {
                currentWinStreak = 0;
            }
        }
        
        metrics.largestWinningStreak = maxWinStreak;
        
        // Largest Losing Streak
        let currentLossStreak = 0;
        let maxLossStreak = 0;
        
        for (const trade of result.trades) {
            if (trade.profit < 0) {
                currentLossStreak++;
                maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
            } else {
                currentLossStreak = 0;
            }
        }
        
        metrics.largestLosingStreak = maxLossStreak;
        
        return metrics;
    }
    
    /**
     * Ejecuta simulaciones de Monte Carlo
     * @param {Object} result - Resultados del backtest
     * @returns {Object} - Resultados de Monte Carlo
     */
    async runMonteCarloSimulations(result) {
        const simulations = [];
        const trades = result.trades;
        
        if (trades.length === 0) {
            return { simulations: [], statistics: {} };
        }
        
        // Extraer retornos de las operaciones
        const returns = trades.map(trade => trade.profit / this.initialCapital);
        
        // Ejecutar simulaciones
        for (let sim = 0; sim < this.monteCarloSimulations; sim++) {
            let balance = this.initialCapital;
            const simulationReturns = [];
            
            // Generar secuencia aleatoria de retornos
            for (let i = 0; i < trades.length; i++) {
                const randomReturn = returns[Math.floor(Math.random() * returns.length)];
                balance += balance * randomReturn;
                simulationReturns.push((balance - this.initialCapital) / this.initialCapital);
            }
            
            simulations.push({
                finalReturn: simulationReturns[simulationReturns.length - 1],
                maxDrawdown: this.calculateSimulationDrawdown(simulationReturns),
                returns: simulationReturns
            });
        }
        
        // Calcular estadísticas
        const finalReturns = simulations.map(sim => sim.finalReturn);
        const maxDrawdowns = simulations.map(sim => sim.maxDrawdown);
        
        finalReturns.sort((a, b) => a - b);
        maxDrawdowns.sort((a, b) => a - b);
        
        const statistics = {};
        
        // Intervalos de confianza para retorno final
        for (const confidence of this.confidenceIntervals) {
            const lowerIndex = Math.floor((1 - confidence) / 2 * finalReturns.length);
            const upperIndex = Math.floor((1 + confidence) / 2 * finalReturns.length);
            
            statistics[`finalReturn_${confidence * 100}%`] = {
                lower: finalReturns[lowerIndex] * 100,
                upper: finalReturns[upperIndex] * 100
            };
        }
        
        // Intervalos de confianza para máximo drawdown
        for (const confidence of this.confidenceIntervals) {
            const lowerIndex = Math.floor((1 - confidence) / 2 * maxDrawdowns.length);
            const upperIndex = Math.floor((1 + confidence) / 2 * maxDrawdowns.length);
            
            statistics[`maxDrawdown_${confidence * 100}%`] = {
                lower: maxDrawdowns[lowerIndex] * 100,
                upper: maxDrawdowns[upperIndex] * 100
            };
        }
        
        // Probabilidad de pérdida
        const lossCount = finalReturns.filter(r => r < 0).length;
        statistics.probabilityOfLoss = (lossCount / finalReturns.length) * 100;
        
        return { simulations, statistics };
    }
    
    /**
     * Calcula el drawdown para una simulación
     * @param {Array} returns - Retornos de la simulación
     * @returns {number} - Máximo drawdown
     */
    calculateSimulationDrawdown(returns) {
        let peak = 0;
        let maxDrawdown = 0;
        
        for (const returnValue of returns) {
            if (returnValue > peak) {
                peak = returnValue;
            } else {
                const drawdown = peak - returnValue;
                maxDrawdown = Math.max(maxDrawdown, drawdown);
            }
        }
        
        return maxDrawdown;
    }
    
    /**
     * Obtiene los resultados de un backtest
     * @param {string} backtestId - ID del backtest
     * @returns {Object|null} - Resultados del backtest
     */
    getBacktestResults(backtestId) {
        return this.backtestResults[backtestId] || null;
    }
    
    /**
     * Obtiene la lista de todos los backtests
     * @returns {Array} - Lista de backtests
     */
    getAllBacktests() {
        return Object.values(this.backtestResults);
    }
    
    /**
     * Obtiene el estado del backtest actual
     * @returns {Object|null} - Estado del backtest actual
     */
    getCurrentBacktestStatus() {
        return this.currentBacktest;
    }
    
    /**
     * Cancela el backtest actual
     */
    cancelCurrentBacktest() {
        if (this.currentBacktest) {
            this.backtestResults[this.currentBacktest.id] = {
                ...this.currentBacktest,
                status: 'cancelled',
                endTime: new Date(),
                executionTime: new Date() - this.currentBacktest.startTime
            };
            
            this.emit('backtestCancelled', { id: this.currentBacktest.id });
            this.currentBacktest = null;
        }
    }
}

module.exports = BacktestEngine;