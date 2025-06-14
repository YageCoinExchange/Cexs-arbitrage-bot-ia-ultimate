// ========== CONFIGURACIÓN INICIAL ==========
require('dotenv').config();

// Chequeo de módulos requeridos
function requireSafe(modulePath, label) {
  try {
    return require(modulePath);
  } catch (e) {
    console.error(`❌ Error: No se pudo cargar el módulo "${label}" (${modulePath})`);
    process.exit(1);
  }
}

// Cargar módulo principal
let CEXArbitrageBot;
try {
  const cexModule = require('./src/core/cex-arbitrage-bot');
  CEXArbitrageBot = cexModule.CEXArbitrageBot || cexModule.default || cexModule;
  if (!CEXArbitrageBot) throw new Error("No se encontró la clase CEXArbitrageBot");
} catch (error) {
  console.error("❌ Error cargando el módulo principal:", error);
  process.exit(1);
}

// Configuración completa
const config = {
  GENERAL: {
    PORT: process.env.PORT || 8888,
    DRY_RUN: process.env.DRY_RUN === 'true'
  },
  MOBILE_API: {
    PORT: process.env.MOBILE_API_PORT || 8426
  },
  AI_TRADING: {
    ENABLED: process.env.AI_TRADING_ENABLED === 'true'
  },
  BACKTESTING: {
    ENABLED: process.env.BACKTESTING_ENABLED === 'true'
  },
  ALERTS: {
    ENABLED: true,
    CHANNELS: {
      EMAIL: false,
      TELEGRAM: false,
      DISCORD: false
    }
  },
  EXCHANGES: {
    BINANCE: {
      API_KEY: process.env.BINANCE_API_KEY,
      API_SECRET: process.env.BINANCE_API_SECRET
    },
    BYBIT: {
      API_KEY: process.env.BYBIT_API_KEY,
      API_SECRET: process.env.BYBIT_API_SECRET
    }
  },
  TRADING_PAIRS: [
    { symbol: 'LTCUSDT', minProfit: 0.002 },
    { symbol: 'BNBUSDT', minProfit: 0.003 },
    { symbol: 'XRPUSDT', minProfit: 0.005 }
  ]
};

// Cargar otros módulos con la configuración
const StrategyManager = requireSafe("./src/strategies/strategy-manager", "StrategyManager");
const { PortfolioManager } = requireSafe("./src/portfolio/portfolio-manager", "PortfolioManager");
const { MLEngine } = requireSafe("./src/ai/ml-engine", "MLEngine");
const { BacktestEngine } = requireSafe("./src/backtesting/backtest-engine", "BacktestEngine");
const AlertManager = requireSafe("./src/alerts/alert-manager", "AlertManager").AlertManager;
const { AdvancedRiskManager } = requireSafe("./src/risk/advanced-risk-manager", "AdvancedRiskManager");
const { MobileAPI } = requireSafe("./src/mobile/mobile-api", "MobileAPI");
const express = requireSafe("express", "Express");

// ========== CLASE MEJORADA DEL BOT ==========
class EnhancedArbitrageBot extends CEXArbitrageBot {
  constructor() {
    super(config);

    // Inicializar componentes con configuración
    this.strategyManager = new StrategyManager(config);
    this.portfolioManager = new PortfolioManager(config);
    this.mlEngine = new MLEngine(config);
    this.backtestEngine = new BacktestEngine(this.strategyManager, config);
    this.alertManager = new AlertManager(config);
    this.advancedRiskManager = new AdvancedRiskManager(config);
    this.mobileAPI = new MobileAPI(config);

    this.setupMobileAPI();
    this.connectAlertManager();

    console.log("🚀 Bot inicializado correctamente");
  }

  setupMobileAPI() {
    const app = express();
    app.use(express.json());
    app.use("/api/mobile", this.mobileAPI.getRouter());
    
    const port = config.MOBILE_API.PORT;
    app.listen(port, () => {
      console.log(`📱 API Móvil en puerto ${port}`);
    });
  }

  connectAlertManager() {
    this.alertManager.getBotStatus = async () => ({
      isRunning: true,
      totalProfit: 0,
      dailyTrades: 0,
      successRate: 0,
      strategy: "default"
    });
  }

  async start() {
    if (config.AI_TRADING.ENABLED) {
      await this.mlEngine.loadModels();
    }
    console.log("🤖 Bot iniciado correctamente");
  }

  async stop() {
    console.log("🛑 Bot detenido correctamente");
  }
}

// ========== INICIAR EL BOT ==========
if (require.main === module) {

  const bot = new CEXArbitrageBot(config)

  process.on("SIGINT", async () => {
    await bot.stop();
    process.exit(0);
  });

  process.on("uncaughtException", (error) => {
    console.error("💥 Error crítico:", error);
    process.exit(1);
  });

  bot.start().catch(error => {
    console.error("❌ Error al iniciar:", error);
    process.exit(1);
  });
}

module.exports = { EnhancedArbitrageBot };