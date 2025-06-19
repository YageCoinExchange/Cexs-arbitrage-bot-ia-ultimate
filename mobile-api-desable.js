const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const admin = require('firebase-admin');

/**
 * API Móvil para el Bot de Arbitraje
 * Proporciona endpoints para la aplicación móvil
 */
class MobileAPI {
    constructor(config) {
        this.config = config;
        this.enabled = config.MOBILE_API.ENABLED;
        this.port = config.MOBILE_API.PORT;
        this.jwtSecret = config.MOBILE_API.JWT_SECRET;
        this.jwtExpiry = config.MOBILE_API.JWT_EXPIRY;
        this.rateLimitConfig = config.MOBILE_API.RATE_LIMIT;
        this.corsConfig = config.MOBILE_API.CORS;
        this.endpoints = config.MOBILE_API.ENDPOINTS;
        this.pushNotifications = config.MOBILE_API.PUSH_NOTIFICATIONS;
        
        this.app = express();
        this.server = null;
        this.bot = null;
        this.authenticatedUsers = new Map();
        
        this.logger = console;
    }
    
    /**
     * Inicializa la API móvil
     */
    async initialize() {
        if (!this.enabled) {
            this.logger.info('Mobile API deshabilitada');
            return;
        }
        
        this.logger.info('Inicializando Mobile API...');
        
        try {
            // Configurar middleware
            this.setupMiddleware();
            
            // Configurar rutas
            this.setupRoutes();
            
            // Inicializar Firebase para notificaciones push
            if (this.pushNotifications.enabled) {
                await this.initializeFirebase();
            }
            
            // Iniciar servidor
            await this.startServer();
            
            this.logger.info(`Mobile API inicializada en puerto ${this.port}`);
        } catch (error) {
            this.logger.error('Error inicializando Mobile API:', error);
            throw error;
        }
    }
    
    /**
     * Configura el middleware de Express
     */
    setupMiddleware() {
        // CORS
        this.app.use(cors(this.corsConfig));
        
        // Rate limiting
        const limiter = rateLimit(this.rateLimitConfig);
        this.app.use(limiter);
        
        // Body parser
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));
        
        // Logging middleware
        this.app.use((req, res, next) => {
            this.logger.info(`${req.method} ${req.path} - ${req.ip}`);
            next();
        });
        
        // Error handling middleware
        this.app.use((error, req, res, next) => {
            this.logger.error('API Error:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        });
    }
    
    /**
     * Configura las rutas de la API
     */
    setupRoutes() {
        // Ruta de autenticación
        this.app.post('/api/mobile/auth/login', this.handleLogin.bind(this));
        this.app.post('/api/mobile/auth/logout', this.authenticateToken.bind(this), this.handleLogout.bind(this));
        this.app.post('/api/mobile/auth/refresh', this.handleRefreshToken.bind(this));
        
        // Rutas protegidas
        this.app.use('/api/mobile/*', this.authenticateToken.bind(this));
        
        // Estado del bot
        this.app.get(this.endpoints.STATUS, this.handleGetStatus.bind(this));
        
        // Operaciones
        this.app.get(this.endpoints.TRADES, this.handleGetTrades.bind(this));
        this.app.get('/api/mobile/trades/:id', this.handleGetTradeDetails.bind(this));
        
        // Portfolio
        this.app.get(this.endpoints.PORTFOLIO, this.handleGetPortfolio.bind(this));
        this.app.get('/api/mobile/portfolio/history', this.handleGetPortfolioHistory.bind(this));
        
        // Alertas
        this.app.get(this.endpoints.ALERTS, this.handleGetAlerts.bind(this));
        this.app.post('/api/mobile/alerts/mark-read', this.handleMarkAlertsRead.bind(this));
        
        // Configuración
        this.app.get(this.endpoints.SETTINGS, this.handleGetSettings.bind(this));
        this.app.put(this.endpoints.SETTINGS, this.handleUpdateSettings.bind(this));
        
        // Control del bot
        this.app.post('/api/mobile/bot/start', this.handleStartBot.bind(this));
        this.app.post('/api/mobile/bot/stop', this.handleStopBot.bind(this));
        this.app.post('/api/mobile/bot/strategy', this.handleChangeStrategy.bind(this));
        
        // Estadísticas
        this.app.get('/api/mobile/stats/summary', this.handleGetStatsSummary.bind(this));
        this.app.get('/api/mobile/stats/performance', this.handleGetPerformanceStats.bind(this));
        
        // Notificaciones push
        this.app.post('/api/mobile/notifications/register', this.handleRegisterDevice.bind(this));
        this.app.post('/api/mobile/notifications/unregister', this.handleUnregisterDevice.bind(this));
        
        // Health check
        this.app.get('/api/mobile/health', (req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });
    }
    
    /**
     * Inicializa Firebase para notificaciones push
     */
    async initializeFirebase() {
        try {
            if (!this.pushNotifications.fcmServerKey) {
                throw new Error('FCM Server Key no configurado');
            }
            
            // En una implementación real, aquí inicializaríamos Firebase Admin SDK
            this.logger.info('Firebase inicializado para notificaciones push');
        } catch (error) {
            this.logger.error('Error inicializando Firebase:', error);
            this.pushNotifications.enabled = false;
        }
    }
    
    /**
     * Inicia el servidor
     */
    async startServer() {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this.port, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }
    
    /**
     * Middleware de autenticación
     */
    authenticateToken(req, res, next) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Token de acceso requerido'
            });
        }
        
        jwt.verify(token, this.jwtSecret, (error, user) => {
            if (error) {
                return res.status(403).json({
                    success: false,
                    error: 'Token inválido'
                });
            }
            
            req.user = user;
            next();
        });
    }
    
    /**
     * Maneja el login
     */
    async handleLogin(req, res) {
        try {
            const { username, password } = req.body;
            
            // En una implementación real, aquí verificaríamos las credenciales
            // Para esta implementación, usaremos credenciales hardcodeadas
            if (username === 'admin' && password === 'admin123') {
                const user = {
                    id: 1,
                    username: 'admin',
                    role: 'admin'
                };
                
                const token = jwt.sign(user, this.jwtSecret, { expiresIn: this.jwtExpiry });
                const refreshToken = jwt.sign(user, this.jwtSecret + '_refresh', { expiresIn: '7d' });
                
                // Guardar usuario autenticado
                this.authenticatedUsers.set(user.id, {
                    ...user,
                    token,
                    refreshToken,
                    loginTime: new Date()
                });
                
                res.json({
                    success: true,
                    data: {
                        user,
                        token,
                        refreshToken
                    }
                });
            } else {
                res.status(401).json({
                    success: false,
                    error: 'Credenciales inválidas'
                });
            }
        } catch (error) {
            this.logger.error('Error en login:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    }
    
    /**
     * Maneja el logout
     */
    async handleLogout(req, res) {
        try {
            const userId = req.user.id;
            
            // Remover usuario autenticado
            this.authenticatedUsers.delete(userId);
            
            res.json({
                success: true,
                message: 'Logout exitoso'
            });
        } catch (error) {
            this.logger.error('Error en logout:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    }
    
    /**
     * Maneja la renovación de token
     */
    async handleRefreshToken(req, res) {
        try {
            const { refreshToken } = req.body;
            
            if (!refreshToken) {
                return res.status(401).json({
                    success: false,
                    error: 'Refresh token requerido'
                });
            }
            
            jwt.verify(refreshToken, this.jwtSecret + '_refresh', (error, user) => {
                if (error) {
                    return res.status(403).json({
                        success: false,
                        error: 'Refresh token inválido'
                    });
                }
                
                const newToken = jwt.sign(
                    { id: user.id, username: user.username, role: user.role },
                    this.jwtSecret,
                    { expiresIn: this.jwtExpiry }
                );
                
                res.json({
                    success: true,
                    data: { token: newToken }
                });
            });
        } catch (error) {
            this.logger.error('Error renovando token:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    }
    
    /**
     * Obtiene el estado del bot
     */
    async handleGetStatus(req, res) {
        try {
            if (!this.bot) {
                return res.status(503).json({
                    success: false,
                    error: 'Bot no disponible'
                });
            }
            
            const status = this.bot.getStatus();
            const riskAnalysis = this.bot.getRiskAnalysis();
            
            res.json({
                success: true,
                data: {
                    ...status,
                    riskAnalysis
                }
            });
        } catch (error) {
            this.logger.error('Error obteniendo estado:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    }
    
    /**
     * Obtiene las operaciones
     */
    async handleGetTrades(req, res) {
        try {
            if (!this.bot) {
                return res.status(503).json({
                    success: false,
                    error: 'Bot no disponible'
                });
            }
            
            const { page = 1, limit = 20, type, status } = req.query;
            const offset = (page - 1) * limit;
            
            let trades = this.bot.getTradeHistory();
            
            // Filtrar por tipo si se especifica
            if (type) {
                trades = trades.filter(trade => trade.type === type);
            }
            
            // Filtrar por estado si se especifica
            if (status) {
                trades = trades.filter(trade => 
                    status === 'success' ? trade.success : !trade.success
                );
            }
            
            // Paginar
            const total = trades.length;
            const paginatedTrades = trades.slice(offset, offset + parseInt(limit));
            
            res.json({
                success: true,
                data: {
                    trades: paginatedTrades,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            this.logger.error('Error obteniendo operaciones:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    }
    
    /**
     * Obtiene detalles de una operación específica
     */
    async handleGetTradeDetails(req, res) {
        try {
            if (!this.bot) {
                return res.status(503).json({
                    success: false,
                    error: 'Bot no disponible'
                });
            }
            
            const { id } = req.params;
            const trades = this.bot.getTradeHistory();
            const trade = trades.find(t => t.id === id);
            
            if (!trade) {
                return res.status(404).json({
                    success: false,
                    error: 'Operación no encontrada'
                });
            }
            
            res.json({
                success: true,
                data: trade
            });
        } catch (error) {
            this.logger.error('Error obteniendo detalles de operación:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    }
    
    /**
     * Obtiene información del portfolio
     */
    async handleGetPortfolio(req, res) {
        try {
            // En una implementación real, obtendríamos datos del portfolio manager
            const portfolioData = {
                totalValue: 10500.75,
                totalProfit: 500.75,
                totalProfitPercentage: 5.01,
                balances: {
                    'Binance': 2625.19,
                    'Coinbase': 2631.25,
                    'Kraken': 2622.15,
                    'Kucoin': 2622.16
                },
                allocation: {
                    'Binance': 25.0,
                    'Coinbase': 25.1,
                    'Kraken': 24.9,
                    'Kucoin': 25.0
                },
                lastUpdate: new Date().toISOString()
            };
            
            res.json({
                success: true,
                data: portfolioData
            });
        } catch (error) {
            this.logger.error('Error obteniendo portfolio:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    }
    
    /**
     * Obtiene historial del portfolio
     */
    async handleGetPortfolioHistory(req, res) {
        try {
            const { period = '7d' } = req.query;
            
            // Simular datos históricos
            const history = [];
            const now = new Date();
            let days;
            
            switch (period) {
                case '1d':
                    days = 1;
                    break;
                case '7d':
                    days = 7;
                    break;
                case '30d':
                    days = 30;
                    break;
                default:
                    days = 7;
            }
            
            for (let i = days; i >= 0; i--) {
                const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                history.push({
                    timestamp: date.toISOString(),
                    value: 10000 + Math.random() * 1000,
                    profit: Math.random() * 100 - 50
                });
            }
            
            res.json({
                success: true,
                data: history
            });
        } catch (error) {
            this.logger.error('Error obteniendo historial de portfolio:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    }
    
    /**
     * Obtiene alertas
     */
    async handleGetAlerts(req, res) {
        try {
            // En una implementación real, obtendríamos alertas del alert manager
            const alerts = [
                {
                    id: 'alert_1',
                    type: 'trade_executed',
                    message: 'Arbitraje ejecutado: BTC/USDT - Ganancia: 0.5%',
                    timestamp: new Date().toISOString(),
                    priority: 'medium',
                    read: false
                },
                {
                    id: 'alert_2',
                    type: 'risk_warning',
                    message: 'Volatilidad alta detectada en el mercado',
                    timestamp: new Date(Date.now() - 3600000).toISOString(),
                    priority: 'high',
                    read: true
                }
            ];
            
            res.json({
                success: true,
                data: alerts
            });
        } catch (error) {
            this.logger.error('Error obteniendo alertas:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    }
    
    /**
     * Marca alertas como leídas
     */
    async handleMarkAlertsRead(req, res) {
        try {
            const { alertIds } = req.body;
            
            // En una implementación real, marcaríamos las alertas como leídas
            this.logger.info(`Marcando alertas como leídas: ${alertIds.join(', ')}`);
            
            res.json({
                success: true,
                message: 'Alertas marcadas como leídas'
            });
        } catch (error) {
            this.logger.error('Error marcando alertas como leídas:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    }
    
    /**
     * Obtiene configuración
     */
    async handleGetSettings(req, res) {
        try {
            const settings = {
                riskLevel: 'medium',
                maxExposure: 20,
                strategies: ['basic', 'triangular'],
                notifications: {
                    trades: true,
                    alerts: true,
                    dailySummary: false
                },
                autoRebalance: true
            };
            
            res.json({
                success: true,
                data: settings
            });
        } catch (error) {
            this.logger.error('Error obteniendo configuración:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    }
    
    /**
     * Actualiza configuración
     */
    async handleUpdateSettings(req, res) {
        try {
            const settings = req.body;
            
            // En una implementación real, actualizaríamos la configuración del bot
            this.logger.info('Actualizando configuración:', settings);
            
            res.json({
                success: true,
                message: 'Configuración actualizada correctamente'
            });
        } catch (error) {
            this.logger.error('Error actualizando configuración:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    }
    
    /**
     * Inicia el bot
     */
    async handleStartBot(req, res) {
        try {
            if (!this.bot) {
                return res.status(503).json({
                    success: false,
                    error: 'Bot no disponible'
                });
            }
            
            const { mode = 'simulation' } = req.body;
            
            await this.bot.start(mode);
            
            // Enviar notificación push
            if (this.pushNotifications.enabled) {
                await this.sendPushNotification(req.user.id, {
                    title: 'Bot Iniciado',
                    body: `Bot iniciado en modo ${mode}`,
                    data: { type: 'bot_started', mode }
                });
            }
            
            res.json({
                success: true,
                message: 'Bot iniciado correctamente'
            });
        } catch (error) {
            this.logger.error('Error iniciando bot:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    
    /**
     * Detiene el bot
     */
    async handleStopBot(req, res) {
        try {
            if (!this.bot) {
                return res.status(503).json({
                    success: false,
                    error: 'Bot no disponible'
                });
            }
            
            await this.bot.stop();
            
            // Enviar notificación push
            if (this.pushNotifications.enabled) {
                await this.sendPushNotification(req.user.id, {
                    title: 'Bot Detenido',
                    body: 'Bot detenido correctamente',
                    data: { type: 'bot_stopped' }
                });
            }
            
            res.json({
                success: true,
                message: 'Bot detenido correctamente'
            });
        } catch (error) {
            this.logger.error('Error deteniendo bot:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    
    /**
     * Cambia la estrategia del bot
     */
    async handleChangeStrategy(req, res) {
        try {
            if (!this.bot) {
                return res.status(503).json({
                    success: false,
                    error: 'Bot no disponible'
                });
            }
            
            const { strategy } = req.body;
            
            this.bot.changeStrategy(strategy);
            
            res.json({
                success: true,
                message: `Estrategia cambiada a ${strategy}`
            });
        } catch (error) {
            this.logger.error('Error cambiando estrategia:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    
    /**
     * Obtiene resumen de estadísticas
     */
    async handleGetStatsSummary(req, res) {
        try {
            const stats = {
                totalTrades: 156,
                successfulTrades: 142,
                failedTrades: 14,
                winRate: 91.03,
                totalProfit: 1250.75,
                averageProfit: 8.79,
                bestTrade: 45.20,
                worstTrade: -12.30,
                sharpeRatio: 1.85,
                maxDrawdown: 3.2
            };
            
            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            this.logger.error('Error obteniendo estadísticas:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    }
    
    /**
     * Obtiene estadísticas de rendimiento
     */
    async handleGetPerformanceStats(req, res) {
        try {
            const { period = '30d' } = req.query;
            
            // Simular datos de rendimiento
            const performance = {
                period,
                totalReturn: 12.5,
                annualizedReturn: 156.2,
                volatility: 8.3,
                sharpeRatio: 1.85,
                maxDrawdown: 3.2,
                calmarRatio: 48.8,
                winRate: 91.03,
                profitFactor: 6.45,
                averageTrade: 8.79,
                tradesPerDay: 5.2
            };
            
            res.json({
                success: true,
                data: performance
            });
        } catch (error) {
            this.logger.error('Error obteniendo estadísticas de rendimiento:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    }
    
    /**
     * Registra dispositivo para notificaciones push
     */
    async handleRegisterDevice(req, res) {
        try {
            const { deviceToken, platform } = req.body;
            const userId = req.user.id;
            
            // En una implementación real, guardaríamos el token del dispositivo
            this.logger.info(`Registrando dispositivo para usuario ${userId}: ${platform}`);
            
            res.json({
                success: true,
                message: 'Dispositivo registrado para notificaciones'
            });
        } catch (error) {
            this.logger.error('Error registrando dispositivo:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    }
    
    /**
     * Desregistra dispositivo para notificaciones push
     */
    async handleUnregisterDevice(req, res) {
        try {
            const { deviceToken } = req.body;
            const userId = req.user.id;
            
            // En una implementación real, removeríamos el token del dispositivo
            this.logger.info(`Desregistrando dispositivo para usuario ${userId}`);
            
            res.json({
                success: true,
                message: 'Dispositivo desregistrado de notificaciones'
            });
        } catch (error) {
            this.logger.error('Error desregistrando dispositivo:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    }
    
    /**
     * Envía notificación push a un usuario
     * @param {number} userId - ID del usuario
     * @param {Object} notification - Datos de la notificación
     */
    async sendPushNotification(userId, notification) {
        try {
            if (!this.pushNotifications.enabled) {
                return;
            }
            
            // En una implementación real, enviaríamos la notificación usando Firebase
            this.logger.info(`Enviando notificación push a usuario ${userId}:`, notification);
        } catch (error) {
            this.logger.error('Error enviando notificación push:', error);
        }
    }
    
    /**
     * Establece la referencia al bot
     * @param {Object} bot - Instancia del bot
     */
    setBot(bot) {
        this.bot = bot;
    }
    
    /**
     * Detiene la API móvil
     */
    async stop() {
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    this.logger.info('Mobile API detenida');
                    resolve();
                });
            });
        }
    }
}

module.exports = MobileAPI;