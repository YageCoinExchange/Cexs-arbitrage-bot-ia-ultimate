const EventEmitter = require('events');

/**
 * Gestor de Portfolio
 * Maneja la distribución y rebalanceo de fondos entre exchanges
 */
class PortfolioManager extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.initialBalance = config.PORTFOLIO.INITIAL_BALANCE;
        this.rebalanceFrequency = config.PORTFOLIO.REBALANCE_FREQUENCY;
        this.targetAllocation = config.PORTFOLIO.TARGET_ALLOCATION;
        this.minBalancePerExchange = config.PORTFOLIO.MIN_BALANCE_PER_EXCHANGE;
        this.reservePercentage = config.PORTFOLIO.RESERVE_PERCENTAGE;
        this.autoCompound = config.PORTFOLIO.AUTO_COMPOUND;
        this.compoundThreshold = config.PORTFOLIO.COMPOUND_THRESHOLD;
        
        this.currentBalances = {};
        this.balanceHistory = [];
        this.allocationHistory = [];
        this.rebalanceHistory = [];
        this.totalValue = 0;
        this.totalProfit = 0;
        this.totalProfitPercentage = 0;
        this.lastRebalance = null;
        this.rebalanceInterval = null;
        
        this.logger = console;

        // ======= AGREGADO DASHBOARD =======
        this._autoRebalanceEnabled = false; // Estado del auto rebalanceo
        // ======= FIN AGREGADO DASHBOARD =======
    }
    
    /**
     * Inicializa el gestor de portfolio
     * @param {Object} initialBalances - Balances iniciales por exchange
     */
    async initialize(initialBalances = {}) {
        this.logger.info('Inicializando Portfolio Manager...');
        
        try {
            // Establecer balances iniciales
            this.currentBalances = { ...initialBalances };
            
            // Si no hay balances iniciales, distribuir el balance inicial
            if (Object.keys(this.currentBalances).length === 0) {
                await this.distributeInitialBalance();
            }
            
            // Calcular valor total inicial
            this.calculateTotalValue();
            
            // Registrar estado inicial
            this.recordBalanceSnapshot();
            this.recordAllocationSnapshot();
            
            // Programar rebalanceo automático
            if (this.rebalanceFrequency > 0) {
                this.scheduleAutoRebalance();
            }
            
            this.logger.info('Portfolio Manager inicializado correctamente');
            this.logger.info(`Valor total del portfolio: $${this.totalValue.toFixed(2)}`);
        } catch (error) {
            this.logger.error('Error inicializando Portfolio Manager:', error);
            throw error;
        }
    }
    
    /**
     * Distribuye el balance inicial según la asignación objetivo
     */
    async distributeInitialBalance() {
        const exchanges = Object.keys(this.targetAllocation);
        const balancePerExchange = this.initialBalance / exchanges.length;
        
        for (const exchange of exchanges) {
            const targetPercentage = this.targetAllocation[exchange];
            this.currentBalances[exchange] = this.initialBalance * targetPercentage;
        }
        
        this.logger.info('Balance inicial distribuido entre exchanges');
    }
    
    /**
     * Calcula el valor total del portfolio
     */
    calculateTotalValue() {
        this.totalValue = Object.values(this.currentBalances).reduce((sum, balance) => sum + balance, 0);
        this.totalProfit = this.totalValue - this.initialBalance;
        this.totalProfitPercentage = ((this.totalProfit / this.initialBalance) * 100);
    }
    
    /**
     * Registra un snapshot del balance actual
     */
    recordBalanceSnapshot() {
        this.balanceHistory.push({
            timestamp: new Date(),
            balances: { ...this.currentBalances },
            totalValue: this.totalValue,
            totalProfit: this.totalProfit,
            totalProfitPercentage: this.totalProfitPercentage
        });
        
        // Mantener solo los últimos 1000 registros
        if (this.balanceHistory.length > 1000) {
            this.balanceHistory.shift();
        }
    }
    
    /**
     * Registra un snapshot de la asignación actual
     */
    recordAllocationSnapshot() {
        const allocation = {};
        
        for (const exchange in this.currentBalances) {
            allocation[exchange] = (this.currentBalances[exchange] / this.totalValue) * 100;
        }
        
        this.allocationHistory.push({
            timestamp: new Date(),
            allocation,
            totalValue: this.totalValue
        });
        
        // Mantener solo los últimos 500 registros
        if (this.allocationHistory.length > 500) {
            this.allocationHistory.shift();
        }
    }
    
    /**
     * Programa el rebalanceo automático
     */
    scheduleAutoRebalance() {
        this._autoRebalanceEnabled = true; // AGREGADO DASHBOARD: marcar como habilitado
        this.rebalanceInterval = setInterval(async () => {
            try {
                await this.checkAndRebalance();
            } catch (error) {
                this.logger.error('Error en rebalanceo automático:', error);
            }
        }, this.rebalanceFrequency);
    }
    
    /**
     * Actualiza los balances del portfolio
     * @param {Object} newBalances - Nuevos balances por exchange
     */
    async updateBalances(newBalances) {
        // Actualizar balances
        this.currentBalances = { ...newBalances };
        
        // Recalcular valor total
        this.calculateTotalValue();
        
        // Registrar snapshot
        this.recordBalanceSnapshot();
        this.recordAllocationSnapshot();
        
        // Verificar si se necesita rebalanceo
        if (await this.shouldRebalance()) {
            this.emit('rebalanceNeeded', {
                balances: this.currentBalances,
                reason: 'Desviación de asignación objetivo'
            });
        }
        
        // Verificar si se debe reinvertir ganancias
        if (this.autoCompound && this.totalProfit >= this.compoundThreshold) {
            await this.compoundProfits();
        }
    }
    
    /**
     * Verifica si se necesita rebalanceo
     * @returns {boolean} - True si se necesita rebalanceo
     */
    async shouldRebalance() {
        const currentAllocation = this.getCurrentAllocation();
        const rebalanceThreshold = this.config.RISK_MANAGEMENT.REBALANCE_THRESHOLD || 0.15;
        
        for (const exchange in this.targetAllocation) {
            const targetPercentage = this.targetAllocation[exchange];
            const currentPercentage = currentAllocation[exchange] || 0;
            const deviation = Math.abs(targetPercentage - currentPercentage);
            
            if (deviation > rebalanceThreshold) {
                this.logger.info(`Rebalanceo necesario: ${exchange} - Objetivo: ${targetPercentage}%, Actual: ${currentPercentage.toFixed(2)}%`);
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Obtiene la asignación actual del portfolio
     * @returns {Object} - Asignación actual por exchange
     */
    getCurrentAllocation() {
        const allocation = {};
        
        for (const exchange in this.currentBalances) {
            allocation[exchange] = (this.currentBalances[exchange] / this.totalValue) * 100;
        }
        
        return allocation;
    }
    
    /**
     * Verifica y ejecuta rebalanceo si es necesario
     */
    async checkAndRebalance() {
        if (await this.shouldRebalance()) {
            await this.rebalancePortfolio();
        }
    }
    
    /**
     * Ejecuta el rebalanceo del portfolio
     */
    async rebalancePortfolio() {
        this.logger.info('Iniciando rebalanceo del portfolio...');
        
        try {
            const rebalanceId = this.generateRebalanceId();
            const startTime = new Date();
            const initialBalances = { ...this.currentBalances };
            
            // Calcular nuevos balances objetivo
            const targetBalances = this.calculateTargetBalances();
            
            // Calcular transferencias necesarias
            const transfers = this.calculateRequiredTransfers(targetBalances);
            
            // Ejecutar transferencias (simulado)
            const executedTransfers = await this.executeTransfers(transfers);
            
            // Actualizar balances
            this.applyTransfers(executedTransfers);
            
            // Registrar rebalanceo
            const rebalanceRecord = {
                id: rebalanceId,
                timestamp: startTime,
                endTime: new Date(),
                initialBalances,
                finalBalances: { ...this.currentBalances },
                targetBalances,
                transfers: executedTransfers,
                totalTransferred: executedTransfers.reduce((sum, t) => sum + t.amount, 0),
                success: true
            };
            
            this.rebalanceHistory.push(rebalanceRecord);
            this.lastRebalance = startTime;
            
            // Mantener solo los últimos 100 rebalanceos
            if (this.rebalanceHistory.length > 100) {
                this.rebalanceHistory.shift();
            }
            
            // Registrar nuevo estado
            this.calculateTotalValue();
            this.recordBalanceSnapshot();
            this.recordAllocationSnapshot();
            
            this.emit('rebalanceCompleted', rebalanceRecord);
            this.logger.info(`Rebalanceo completado: $${rebalanceRecord.totalTransferred.toFixed(2)} transferidos`);
            
        } catch (error) {
            this.logger.error('Error ejecutando rebalanceo:', error);
            
            // Registrar rebalanceo fallido
            this.rebalanceHistory.push({
                id: this.generateRebalanceId(),
                timestamp: new Date(),
                success: false,
                error: error.message
            });
            
            this.emit('rebalanceError', { error: error.message });
        }
    }
    
    /**
     * Calcula los balances objetivo según la asignación
     * @returns {Object} - Balances objetivo por exchange
     */
    calculateTargetBalances() {
        const targetBalances = {};
        const availableBalance = this.totalValue * (1 - this.reservePercentage);
        
        for (const exchange in this.targetAllocation) {
            const targetPercentage = this.targetAllocation[exchange];
            targetBalances[exchange] = availableBalance * targetPercentage;
            
            // Asegurar balance mínimo
            if (targetBalances[exchange] < this.minBalancePerExchange) {
                targetBalances[exchange] = this.minBalancePerExchange;
            }
        }
        
        return targetBalances;
    }
    
    /**
     * Calcula las transferencias necesarias para el rebalanceo
     * @param {Object} targetBalances - Balances objetivo
     * @returns {Array} - Lista de transferencias necesarias
     */
    calculateRequiredTransfers(targetBalances) {
        const transfers = [];
        const surplusExchanges = [];
        const deficitExchanges = [];
        
        // Identificar exchanges con exceso y déficit
        for (const exchange in this.currentBalances) {
            const currentBalance = this.currentBalances[exchange];
            const targetBalance = targetBalances[exchange] || 0;
            const difference = currentBalance - targetBalance;
            
            if (difference > 1) { // Margen de $1 para evitar transferencias mínimas
                surplusExchanges.push({
                    exchange,
                    surplus: difference
                });
            } else if (difference < -1) {
                deficitExchanges.push({
                    exchange,
                    deficit: -difference
                });
            }
        }
        
        // Ordenar por cantidad (mayor primero)
        surplusExchanges.sort((a, b) => b.surplus - a.surplus);
        deficitExchanges.sort((a, b) => b.deficit - a.deficit);
        
        // Calcular transferencias
        for (const deficitExchange of deficitExchanges) {
            let remainingDeficit = deficitExchange.deficit;
            
            for (let i = 0; i < surplusExchanges.length && remainingDeficit > 0; i++) {
                const surplusExchange = surplusExchanges[i];
                
                if (surplusExchange.surplus <= 0) continue;
                
                const transferAmount = Math.min(surplusExchange.surplus, remainingDeficit);
                
                if (transferAmount > 1) { // Transferir solo si es mayor a $1
                    transfers.push({
                        from: surplusExchange.exchange,
                        to: deficitExchange.exchange,
                        amount: transferAmount
                    });
                    
                    surplusExchange.surplus -= transferAmount;
                    remainingDeficit -= transferAmount;
                }
            }
        }
        
        return transfers;
    }
    
    /**
     * Ejecuta las transferencias (simulado)
     * @param {Array} transfers - Lista de transferencias
     * @returns {Array} - Transferencias ejecutadas
     */
    async executeTransfers(transfers) {
        const executedTransfers = [];
        
        for (const transfer of transfers) {
            try {
                // Simular latencia de transferencia
                await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
                
                // Simular éxito/fallo (98% éxito)
                const success = Math.random() > 0.02;
                
                if (success) {
                    // Simular fee de transferencia (0.1%)
                    const fee = transfer.amount * 0.001;
                    const netAmount = transfer.amount - fee;
                    
                    executedTransfers.push({
                        ...transfer,
                        netAmount,
                        fee,
                        success: true,
                        timestamp: new Date()
                    });
                    
                    this.logger.info(`Transferencia ejecutada: $${transfer.amount.toFixed(2)} de ${transfer.from} a ${transfer.to}`);
                } else {
                    throw new Error('Transferencia fallida');
                }
            } catch (error) {
                this.logger.error(`Error en transferencia de ${transfer.from} a ${transfer.to}:`, error);
                
                executedTransfers.push({
                    ...transfer,
                    success: false,
                    error: error.message,
                    timestamp: new Date()
                });
            }
        }
        
        return executedTransfers;
    }
    
    /**
     * Aplica las transferencias a los balances
     * @param {Array} transfers - Transferencias ejecutadas
     */
    applyTransfers(transfers) {
        for (const transfer of transfers) {
            if (transfer.success) {
                // Restar del exchange origen
                this.currentBalances[transfer.from] -= transfer.amount;
                
                // Sumar al exchange destino (menos fee)
                this.currentBalances[transfer.to] += transfer.netAmount;
            }
        }
    }
    
    /**
     * Reinvierte las ganancias en el portfolio
     */
    async compoundProfits() {
        if (this.totalProfit < this.compoundThreshold) {
            return;
        }
        
        this.logger.info(`Reinvirtiendo ganancias: $${this.totalProfit.toFixed(2)}`);
        
        try {
            // Distribuir ganancias según asignación objetivo
            for (const exchange in this.targetAllocation) {
                const allocationPercentage = this.targetAllocation[exchange];
                const additionalAmount = this.totalProfit * allocationPercentage;
                
                this.currentBalances[exchange] += additionalAmount;
            }
            
            // Actualizar balance inicial para reflejar la reinversión
            this.initialBalance = this.totalValue;
            
            // Recalcular métricas
            this.calculateTotalValue();
            this.recordBalanceSnapshot();
            this.recordAllocationSnapshot();
            
            this.emit('profitsCompounded', {
                amount: this.totalProfit,
                newInitialBalance: this.initialBalance
            });
            
            this.logger.info('Ganancias reinvertidas correctamente');
        } catch (error) {
            this.logger.error('Error reinvirtiendo ganancias:', error);
        }
    }
    
    /**
     * Genera un ID único para el rebalanceo
     * @returns {string} - ID del rebalanceo
     */
    generateRebalanceId() {
        return `rebalance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Obtiene el estado actual del portfolio
     * @returns {Object} - Estado del portfolio
     */
    getPortfolioStatus() {
        return {
            totalValue: this.totalValue,
            totalProfit: this.totalProfit,
            totalProfitPercentage: this.totalProfitPercentage,
            currentBalances: { ...this.currentBalances },
            currentAllocation: this.getCurrentAllocation(),
            targetAllocation: { ...this.targetAllocation },
            lastRebalance: this.lastRebalance,
            nextRebalanceCheck: this.lastRebalance ? 
                new Date(this.lastRebalance.getTime() + this.rebalanceFrequency) : 
                new Date()
        };
    }

    // ======= AGREGADO DASHBOARD: API paneles de rebalanceo y balances =======
    getBalances() {
        // Devuelve balances actuales
        return { ...this.currentBalances }
    }
    isAutoRebalanceEnabled() {
        return !!this._autoRebalanceEnabled
    }
    enableAutoRebalance() {
        if (!this._autoRebalanceEnabled) {
            this._autoRebalanceEnabled = true;
            if (!this.rebalanceInterval && this.rebalanceFrequency > 0) {
                this.scheduleAutoRebalance();
            }
        }
    }
    disableAutoRebalance() {
        if (this._autoRebalanceEnabled) {
            this._autoRebalanceEnabled = false;
            if (this.rebalanceInterval) {
                clearInterval(this.rebalanceInterval);
                this.rebalanceInterval = null;
            }
        }
    }
    // ======= FIN AGREGADO DASHBOARD =======
    
    /**
     * Obtiene el historial de balances
     * @param {number} limit - Límite de registros
     * @returns {Array} - Historial de balances
     */
    getBalanceHistory(limit = 100) {
        return this.balanceHistory.slice(-limit);
    }
    
    /**
     * Obtiene el historial de asignaciones
     * @param {number} limit - Límite de registros
     * @returns {Array} - Historial de asignaciones
     */
    getAllocationHistory(limit = 100) {
        return this.allocationHistory.slice(-limit);
    }
    
    /**
     * Obtiene el historial de rebalanceos
     * @param {number} limit - Límite de registros
     * @returns {Array} - Historial de rebalanceos
     */
    getRebalanceHistory(limit = 50) {
        return this.rebalanceHistory.slice(-limit);
    }
    
    /**
     * Actualiza la asignación objetivo
     * @param {Object} newAllocation - Nueva asignación objetivo
     */
    updateTargetAllocation(newAllocation) {
        // Validar que las asignaciones sumen 100%
        const totalAllocation = Object.values(newAllocation).reduce((sum, allocation) => sum + allocation, 0);
        
        if (Math.abs(totalAllocation - 1.0) > 0.01) {
            throw new Error('La asignación total debe sumar 100%');
        }
        
        this.targetAllocation = { ...newAllocation };
        this.logger.info('Asignación objetivo actualizada:', this.targetAllocation);
        
        // Verificar si se necesita rebalanceo inmediato
        this.checkAndRebalance();
    }
    
    /**
     * Detiene el gestor de portfolio
     */
    stop() {
        if (this.rebalanceInterval) {
            clearInterval(this.rebalanceInterval);
            this.rebalanceInterval = null;
        }
        
        this._autoRebalanceEnabled = false; // AGREGADO DASHBOARD: marcar como deshabilitado
        this.logger.info('Portfolio Manager detenido');
    }
}

module.exports = PortfolioManager;