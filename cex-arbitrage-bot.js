const StrategyManager = require('./StrategyManager');
const AlertManager = require('./AlertManager');
const ExchangeManager = require('../exchanges/exchange-manager');

class CEXArbitrageBot {
    constructor(config) {
        this.config = config;
        this.logger = console;
        this.exchangeManager = new ExchangeManager(config);
        this.strategyManager = new StrategyManager(config);   // <-- AGREGADO
        this.alertManager = new AlertManager(config);         // <-- AGREGADO
        console.log("✅ CEXArbitrageBot base inicializado");
        this.botState = {
            isRunning: false,
            totalProfit: 0
        };
    }

    async initialize() {
    this.logger.info('Iniciando bot de arbitraje...');
    if (typeof this.strategyManager.initialize === 'function') {
        this.strategyManager.initialize();
    }
    await this.alertManager.initialize();
    this.logger.info('Bot inicializado correctamente');
}

    async start() {
        console.log("⚙️ Bot base iniciado");
        if (this.isRunning) return;
        await this.initialize();
        this.isRunning = true;
        this.logger.info('Bot arrancando ciclo de arbitraje...');
        while (this.isRunning) {
            try {
                const prices = {
                    BINANCE: Math.random() * 100 + 100,
                    KUCOIN: Math.random() * 100 + 100,
                    OKX: Math.random() * 100 + 100
                };
                const pair = "BTC/USDT";
                const opportunities = [
                    ...this.strategyManager.findBasicArbitrage(prices, pair),
                    ...this.strategyManager.findTriangularArbitrage(prices, pair),
                    ...this.strategyManager.findStatisticalArbitrage(prices, pair)
                ];
                if (opportunities.length > 0) {
                    for (const opp of opportunities) {
                        await this.alertManager.sendAlert(
                            "OPPORTUNITY",
                            `Oportunidad de arbitraje detectada: ${opp.strategy} (${opp.profitPercentage.toFixed(2)}%)`,
                            opp
                        );
                        this.strategyManager.updateStrategyPerformance(opp.strategy, {
                            success: true,
                            profit: opp.profitPercentage
                        });
                    }
                }
                await this._sleep(10000);
            } catch (error) {
                this.logger.error('Error en el ciclo principal:', error);
            }
        }
    }

    stop() {
        console.log("⚙️ Bot base detenido");
        this.isRunning = false;
        this.logger.info('Bot detenido.');
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = { CEXArbitrageBot };