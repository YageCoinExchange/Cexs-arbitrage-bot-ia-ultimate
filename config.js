/**
 * Configuración completa del Bot de YageCoin Exchange CEX con IA
 */


module.exports = {
  // Configuración general
  CHECK_INTERVAL: 5000, // Intervalo de verificación en ms
  TRADING_PAIRS: ["LTC/USDT", "BNB/USDT", "XRP/USDT"], // SOLO los tres pares indicados

  // Configuración de Exchanges - SOLO BINANCE Y BYBIT HABILITADOS
  EXCHANGES: {
    BINANCE: {
      name: "Binance",
      apiKey: process.env.BINANCE_API_KEY || "",
      apiSecret: process.env.BINANCE_API_SECRET || "",
      sandbox: process.env.NODE_ENV !== "production",
      rateLimit: 10,
      fees: {
        maker: 0.1,
        taker: 0.1,
      },
      enabled: true, // ✅ HABILITADO
    },
    COINBASE: {
      name: "Coinbase",
      apiKey: process.env.COINBASE_API_KEY || "",
      apiSecret: process.env.COINBASE_API_SECRET || "",
      passphrase: process.env.COINBASE_PASSPHRASE || "",
      sandbox: process.env.NODE_ENV !== "production",
      rateLimit: 10,
      fees: {
        maker: 0.005,
        taker: 0.005,
      },
      enabled: false, // ❌ DESHABILITADO
    },
    KRAKEN: {
      name: "Kraken",
      apiKey: process.env.KRAKEN_API_KEY || "",
      apiSecret: process.env.KRAKEN_API_SECRET || "",
      sandbox: process.env.NODE_ENV !== "production",
      rateLimit: 10,
      fees: {
        maker: 0.0016,
        taker: 0.0026,
      },
      enabled: false, // ❌ DESHABILITADO
    },
    KUCOIN: {
      name: "Kucoin",
      apiKey: process.env.KUCOIN_API_KEY || "",
      apiSecret: process.env.KUCOIN_API_SECRET || "",
      passphrase: process.env.KUCOIN_PASSPHRASE || "",
      sandbox: process.env.NODE_ENV !== "production",
      rateLimit: 10,
      fees: {
        maker: 0.001,
        taker: 0.001,
      },
      enabled: false, // ❌ DESHABILITADO - CAMBIADO A BYBIT
    },
    BYBIT: {
      name: "Bybit",
      apiKey: process.env.BYBIT_API_KEY || "",
      apiSecret: process.env.BYBIT_API_SECRET || "",
      sandbox: process.env.NODE_ENV !== "production",
      rateLimit: 10,
      fees: {
        maker: 0.1,
        taker: 0.1,
      },
      enabled: true, // ✅ HABILITADO - NUEVO
    },
  },

  // === NUEVO BLOQUE PARA REDES, DIRECCIONES Y MINIMOS DE DEPOSITO/RETIRO ===
  TOKEN_NETWORKS: {
    BINANCE: {
      USDT: {
        address: "EQD5mxRgCuRNLxKxeOjG6r14iSroLF5FtomPnet-sgP5xNJb",
        memo: "163771801",
        network: "TON",
        minDeposit: 0.002,
        minWithdraw: 10,
        withdrawFee: 0.20,
        withdrawToken: "USDC", // Confirmar si es USDT o USDC en TON
        note: "Depósito mínimo en TON: 0.002 USDT"
      },
      LTC: {
        address: "LiCH4dMWM6YRHFWYC78hppAk1SwUFkDAK4",
        network: "Litecoin",
        minDeposit: 0.002,
        minWithdraw: 0.002,
        withdrawFee: 0.0001,
        withdrawToken: "LTC"
      },
      BNB: {
        address: "0xe5b10a8fa449155d5b4b657dab4e856815d52bd7",
        network: "BEP20",
        minDeposit: 0.000003,
        minWithdraw: 0.0005,
        withdrawFee: 0.00001,
        withdrawToken: "BNB"
      },
      XRP: {
        address: "rNxp4h8apvRis6mJf9Sh8C6iRxfrDWN7AV",
        tag: "466152795",
        network: "XRP",
        minDeposit: 0.001,
        minWithdraw: 2,
        withdrawFee: 0.2,
        withdrawToken: "XRP"
      }
    },
    BYBIT: {
      USDT: {
        address: "UQCT1S9xDKxJV7zpOYNpnof-_xym-dG7W3TYxeGLxLKSSSvB",
        network: "TON",
        minDeposit: 0.001,
        minWithdraw: 1,
        withdrawFee: 0.3,
        withdrawToken: "USDT"
      },
      LTC: {
        address: "LLCxH3L5fn9ejTPVk3nWTJcqvvTWsu2LbJ",
        network: "Litecoin",
        minDeposit: 0.00000001,
        minWithdraw: 0.001,
        withdrawFee: 0.0001,
        withdrawToken: "LTC"
      },
      BNB: {
        address: "0x4231d188a91481a8c3d39d444b7451436babee94",
        network: "BEP20",
        minDeposit: 0.000,
        minWithdraw: 0.0002,
        withdrawFee: 0.0002,
        withdrawToken: "BNB"
      },
      XRP: {
        address: "rJn2zAPdFA193sixJwuFixRkYDUtx3apQh",
        tag: "501350199",
        network: "XRP",
        minDeposit: 0.01,
        minWithdraw: 1.2,
        withdrawFee: 0.2,
        withdrawToken: "XRP"
      }
    }
  },

// Configuración de Gestión de Riesgos
  RISK_MANAGEMENT: {
    RISK_LEVEL: "medium",
    MAX_DRAWDOWN: 0.05,
    MAX_EXPOSURE: 0.2,
    STOP_LOSS_PERCENTAGE: 0.02,
    VOLATILITY_THRESHOLD: 0.1,
    MAX_DAILY_TRADES: 100,
    MAX_CONCURRENT_TRADES: 5,
    MIN_PROFIT_THRESHOLD: 0.1,
    REBALANCE_THRESHOLD: 0.15,
    EMERGENCY_STOP_LOSS: 0.1,
    MIN_TRADE_AMOUNT: 10, // Mínimo por operación
    MAX_TRADE_AMOUNT: 10, // Máximo por operación
    MAX_SLIPPAGE: 0.005, // 0.5% de slippage máximo tolerado
    MIN_SPREAD: 0.1, // 0.1% spread mínimo para arbitrar
    EXCHANGE_RISK_SCORES: {
      Binance: 1.0,
      Bybit: 1.3,
    },
  },

  // Configuración de Portfolio
  PORTFOLIO: {
    INITIAL_BALANCE: 15, // 15 USDT por exchange
    REBALANCE_FREQUENCY: 3600000,
    TARGET_ALLOCATION: {
      Binance: 0.5,
      Bybit: 0.5,
    },
    MIN_BALANCE_PER_EXCHANGE: 15,
    RESERVE_PERCENTAGE: 0.1,
    AUTO_COMPOUND: true,
    COMPOUND_THRESHOLD: 100,
  },

  // Límites y reglas del exchange
  EXCHANGE_LIMITS: {
    BINANCE: {
      dailyWithdrawLimit: null,
      tradingLimit: null,
      countryRestrictions: null
    },
    BYBIT: {
      dailyWithdrawLimit: null,
      tradingLimit: null,
      countryRestrictions: null
    }
  },

  // Configuración de Estrategias
  STRATEGIES: {
    BASIC: {
      name: "Arbitraje Básico",
      enabled: true,
      minProfitPercentage: 0.2,
      maxInvestmentPercentage: 0.1,
      timeoutMs: 30000,
    },
    TRIANGULAR: {
      name: "Arbitraje Triangular",
      enabled: true,
      minProfitPercentage: 0.15,
      maxInvestmentPercentage: 0.08,
      timeoutMs: 45000,
      maxHops: 3,
    },
    STATISTICAL: {
      name: "Arbitraje Estadístico",
      enabled: true,
      lookbackPeriod: 100,
      zScoreThreshold: 2.0,
      meanReversionTime: 300000,
      minProfitPercentage: 0.1,
    },
    ML: {
      name: "Machine Learning",
      enabled: true,
      modelType: "random_forest",
      features: ["price_spread", "volume_ratio", "volatility", "time_of_day", "market_sentiment"],
      retrainInterval: 86400000,
      confidenceThreshold: 0.7,
    },
    COMBINED: {
      name: "Estrategia Combinada",
      enabled: true,
      strategies: ["BASIC", "TRIANGULAR", "STATISTICAL"],
      votingThreshold: 2,
      weightings: {
        BASIC: 0.4,
        TRIANGULAR: 0.3,
        STATISTICAL: 0.3,
      },
    },
  },

  // Configuración de IA y Machine Learning
  AI_TRADING: {
    ENABLED: true,
    MODEL_PATH: "./models/",
    TRAINING_DATA_DAYS: 30,
    PREDICTION_HORIZON: 300000,
    FEATURES: {
      TECHNICAL_INDICATORS: true,
      MARKET_SENTIMENT: true,
      ORDER_BOOK_ANALYSIS: true,
      VOLUME_ANALYSIS: true,
      CORRELATION_ANALYSIS: true,
    },
    MODELS: {
      PRICE_PREDICTION: {
        type: "lstm",
        layers: [50, 50, 25],
        epochs: 100,
        batchSize: 32,
      },
      OPPORTUNITY_SCORING: {
        type: "random_forest",
        nEstimators: 100,
        maxDepth: 10,
      },
      RISK_ASSESSMENT: {
        type: "gradient_boosting",
        nEstimators: 50,
        learningRate: 0.1,
      },
    },
    AUTO_RETRAIN: true,
    RETRAIN_THRESHOLD: 0.05,
    SENTIMENT_SOURCES: ["twitter", "reddit", "news", "fear_greed_index"],
  },

  // Configuración de Backtesting
  BACKTESTING: {
    ENABLED: true,
    DATA_SOURCE: "historical_api",
    DEFAULT_PERIOD: 30,
    COMMISSION_RATE: 0.001,
    SLIPPAGE_RATE: 0.0005,
    INITIAL_CAPITAL: 10000,
    BENCHMARK: "BTC",
    METRICS: ["total_return", "sharpe_ratio", "max_drawdown", "win_rate", "profit_factor", "calmar_ratio"],
    MONTE_CARLO_SIMULATIONS: 1000,
    CONFIDENCE_INTERVALS: [0.95, 0.99],
  },

  // *** CONFIGURACIÓN DE ALERTAS COMPLETAS ***
  ALERTS: {
    ENABLED: true,
    CHANNELS: {
      EMAIL: {
        enabled: process.env.EMAIL_ENABLED === "true",
        smtp: {
          host: process.env.EMAIL_SERVICE === "gmail" ? "smtp.gmail.com" : "smtp.gmail.com",
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER || "",
            pass: process.env.EMAIL_PASS || "",
          },
        },
        from: process.env.EMAIL_USER || "bot@arbitrage.com",
        to: process.env.EMAIL_TO || "admin@arbitrage.com",
      },
      TELEGRAM: {
        enabled: true,
        botToken: process.env.TELEGRAM_BOT_TOKEN || "",
        chatId: process.env.TELEGRAM_CHAT_ID || "",
        parseMode: "HTML",
      },
      DISCORD: {
        enabled: false,
        webhookUrl: process.env.DISCORD_WEBHOOK_URL || "",
      },
      SLACK: {
        enabled: false,
        webhookUrl: process.env.SLACK_WEBHOOK_URL || "",
      },
    },
    ALERT_TYPES: {
      // *** ALERTAS DE SISTEMA ***
      BOT_STARTED: {
        enabled: true,
        channels: ["telegram", "email"],
        priority: "medium",
      },
      BOT_STOPPED: {
        enabled: true,
        channels: ["telegram", "email"],
        priority: "high",
      },
      SYSTEM_ERROR: {
        enabled: true,
        channels: ["telegram", "email"],
        priority: "critical",
      },
      CONNECTION_ERROR: {
        enabled: true,
        channels: ["telegram"],
        priority: "high",
      },

      // *** ALERTAS DE TRADING ***
      TRADE_EXECUTED: {
        enabled: true,
        channels: ["telegram"],
        priority: "medium",
      },
      TRADE_FAILED: {
        enabled: true,
        channels: ["telegram", "email"],
        priority: "high",
      },
      OPPORTUNITY_FOUND: {
        enabled: true,
        channels: ["telegram"],
        priority: "low",
      },
      PAIR_ANALYSIS: {
        enabled: true,
        channels: ["telegram"],
        priority: "low",
      },

      // *** ALERTAS DE BALANCE ***
      BALANCE_UPDATE: {
        enabled: true,
        channels: ["telegram"],
        priority: "low",
      },
      LOW_BALANCE: {
        enabled: true,
        channels: ["telegram", "email"],
        priority: "high",
      },
      BALANCE_REBALANCED: {
        enabled: true,
        channels: ["telegram"],
        priority: "medium",
      },

      // *** ALERTAS DE GANANCIAS ***
      PROFIT_MILESTONE: {
        enabled: true,
        channels: ["telegram", "email"],
        priority: "high",
        milestones: [50, 100, 250, 500, 1000], // USD
      },
      DAILY_PROFIT: {
        enabled: true,
        channels: ["telegram"],
        priority: "medium",
      },

      // *** ALERTAS DE RIESGO ***
      RISK_WARNING: {
        enabled: true,
        channels: ["telegram", "email"],
        priority: "high",
      },
      HIGH_VOLATILITY: {
        enabled: true,
        channels: ["telegram"],
        priority: "medium",
      },
      STOP_LOSS_TRIGGERED: {
        enabled: true,
        channels: ["telegram", "email"],
        priority: "critical",
      },

      // *** ALERTAS PERIÓDICAS ***
      HOURLY_SUMMARY: {
        enabled: true,
        channels: ["telegram"],
        priority: "low",
      },
      DAILY_SUMMARY: {
        enabled: true,
        channels: ["telegram", "email"],
        priority: "medium",
        time: "23:59",
      },
      WEEKLY_SUMMARY: {
        enabled: true,
        channels: ["email"],
        priority: "medium",
      },

      // *** ALERTAS GENERALES ***
      INFO: {
        enabled: true,
        channels: ["telegram"],
        priority: "low",
      },
      WARNING: {
        enabled: true,
        channels: ["telegram"],
        priority: "medium",
      },
      ERROR: {
        enabled: true,
        channels: ["telegram", "email"],
        priority: "high",
      },
    },
  },

  // Configuración de API Móvil
  MOBILE_API: {
    ENABLED: false,
    PORT: process.env.MOBILE_API_PORT || 8426,
    JWT_SECRET: process.env.JWT_SECRET || "your-secret-key",
    JWT_EXPIRY: "24h",
    RATE_LIMIT: {
      windowMs: 15 * 60 * 1000,
      max: 100,
    },
    CORS: {
      origin: process.env.MOBILE_APP_URL || "*",
      credentials: true,
    },
    ENDPOINTS: {
      STATUS: "/api/mobile/status",
      TRADES: "/api/mobile/trades",
      PORTFOLIO: "/api/mobile/portfolio",
      ALERTS: "/api/mobile/alerts",
      SETTINGS: "/api/mobile/settings",
    },
    PUSH_NOTIFICATIONS: {
      enabled: true,
      fcmServerKey: process.env.FCM_SERVER_KEY || "",
      topics: ["trades", "alerts", "system"],
    },
  },

  // Configuración de Base de Datos
  DATABASE: {
    TYPE: "mongodb",
    URL: process.env.DATABASE_URL || "mongodb://localhost:27017/arbitrage_bot",
    OPTIONS: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
    COLLECTIONS: {
      TRADES: "trades",
      BALANCES: "balances",
      PRICES: "prices",
      ALERTS: "alerts",
      SETTINGS: "settings",
      ML_MODELS: "ml_models",
    },
  },

  // Configuración de Logging
  LOGGING: {
    LEVEL: process.env.LOG_LEVEL || "info",
    FILE: {
      enabled: true,
      path: "./logs/",
      maxSize: "10m",
      maxFiles: 5,
      datePattern: "YYYY-MM-DD",
    },
    CONSOLE: {
      enabled: true,
      colorize: true,
      timestamp: true,
    },
    REMOTE: {
      enabled: false,
      endpoint: process.env.LOG_ENDPOINT || "",
      apiKey: process.env.LOG_API_KEY || "",
    },
  },

  // Configuración de Seguridad
  SECURITY: {
    API_ENCRYPTION: true,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || "your-encryption-key",
    TWO_FACTOR_AUTH: {
      enabled: false,
      secret: process.env.TOTP_SECRET || "",
    },
    IP_WHITELIST: process.env.IP_WHITELIST ? process.env.IP_WHITELIST.split(",") : [],
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 300000,
    SESSION_TIMEOUT: 3600000,
  },

  // Configuración de Performance
  PERFORMANCE: {
    MAX_MEMORY_USAGE: 512,
    CPU_THRESHOLD: 80,
    GARBAGE_COLLECTION: {
      enabled: true,
      interval: 300000,
    },
    CACHE: {
      enabled: true,
      ttl: 60000,
      maxSize: 1000,
    },
    COMPRESSION: {
      enabled: true,
      level: 6,
    },
  },

  // Configuración de Desarrollo
  DEVELOPMENT: {
    DEBUG_MODE: process.env.NODE_ENV === "development",
    MOCK_EXCHANGES: process.env.MOCK_EXCHANGES === "true",
    SIMULATION_ONLY: process.env.SIMULATION_ONLY === "true",
    HOT_RELOAD: true,
    PROFILING: {
      enabled: false,
      interval: 60000,
    },
  },
}
