class Dashboard {
    constructor() {
        this.chartColors = {
            red: 'rgb(255, 99, 132)',
            orange: 'rgb(255, 159, 64)',
            yellow: 'rgb(255, 205, 86)',
            green: 'rgb(75, 192, 192)',
            blue: 'rgb(54, 162, 235)',
            purple: 'rgb(153, 102, 255)',
            grey: 'rgb(201, 203, 207)'
        };
        
        this.profitChart = null;
        this.balanceChart = null;
        this.opportunitiesChart = null;
        this.riskChart = null;
        this.isSimulationMode = true; // Por defecto en modo simulación
        
        this.initCharts();
        this.initEventListeners();
        this.startDataPolling();
    }
    
    initEventListeners() {
        document.getElementById('start-bot').addEventListener('click', () => this.startBot());
        document.getElementById('stop-bot').addEventListener('click', () => this.stopBot());
        document.getElementById('toggle-mode').addEventListener('click', () => this.toggleMode());
        document.getElementById('rebalance-funds').addEventListener('click', () => this.rebalanceFunds());
        
        // Listeners para cambiar estrategias
        document.getElementById('strategy-selector').addEventListener('change', (e) => {
            this.changeStrategy(e.target.value);
        });
        
        // Listeners para ajustes de riesgo
        document.getElementById('risk-level').addEventListener('change', (e) => {
            this.updateRiskSettings({riskLevel: e.target.value});
        });

        // ============= AGREGADO PARA DASHBOARD (panel IA y auto-rebalance) =============
        const toggleIA = document.getElementById('toggle-ia');
        if (toggleIA) {
            toggleIA.addEventListener('click', () => this.toggleIA());
        }
        const toggleAutoRebalance = document.getElementById('toggle-auto-rebalance');
        if (toggleAutoRebalance) {
            toggleAutoRebalance.addEventListener('click', () => this.toggleAutoRebalance());
        }
        // ============= FIN AGREGADO =============
    }
    
    startDataPolling() {
        // Actualizar datos cada 5 segundos
        setInterval(() => {
            this.updateBotStatus();
            this.updateProfitChart();
            this.updateBalanceChart();
            this.updateOpportunitiesChart();
            this.updateRiskAnalysis();
            // ============= AGREGADO PARA DASHBOARD ============
            this.updateAIRecommendations();
            this.updateAnomaliesPanel();
            this.updateCommissionPanel();
            this.updateAutoRebalancePanel();
            // ============= FIN AGREGADO ============
        }, 5000);
        
        // Inicializar con datos actuales
        this.updateBotStatus();
        this.updateProfitChart();
        this.updateBalanceChart();
        this.updateOpportunitiesChart();
        this.updateRiskAnalysis();
        // ============= AGREGADO PARA DASHBOARD ============
        this.updateAIRecommendations();
        this.updateAnomaliesPanel();
        this.updateCommissionPanel();
        this.updateAutoRebalancePanel();
        // ============= FIN AGREGADO ============
    }
    
    async updateBotStatus() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            
            this.updateElement("bot-status", data.isRunning ? "Activo" : "Inactivo");
            this.updateElement("bot-status-indicator", data.isRunning ? "active" : "inactive");
            this.updateElement("total-profit", `$${data.totalProfit.toFixed(2)}`);
            this.updateElement("total-trades", data.totalTrades);
            this.updateElement("successful-trades", data.successfulTrades);
            this.updateElement("failed-trades", data.failedTrades);
            this.updateElement("current-strategy", data.currentStrategy);
            this.updateElement("risk-level", data.riskLevel);
            
            // Nuevas métricas añadidas
            this.updateElement("trading-pairs", data.tradingPairs.join(", ") || "Ninguno");
            this.updateElement("cycle-interval", (data.checkInterval / 1000).toFixed(1) || "0");
            this.updateElement("average-latency", data.averageLatency || "N/A");
            
            // Actualizar modo (simulación/producción)
            this.updateElement("current-mode", this.isSimulationMode ? "Simulación" : "Producción");
            
            // Actualizar balances con formato correcto
            if (data.balances) {
                const balanceContainer = document.getElementById("exchange-balances");
                balanceContainer.innerHTML = "";
                
                Object.entries(data.balances).forEach(([exchange, balance]) => {
                    const balanceItem = document.createElement("div");
                    balanceItem.className = "balance-item";
                    balanceItem.innerHTML = `
                        <span class="exchange-name">${exchange}:</span>
                        <span class="exchange-balance">$${parseFloat(balance).toLocaleString('es-ES', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })}</span>
                    `;
                    balanceContainer.appendChild(balanceItem);
                });
            }
        } catch (error) {
            console.error("Error al actualizar el estado del bot:", error);
        }
    }
    
    async updateProfitChart() {
        try {
            const response = await fetch('/api/profit-history');
            const data = await response.json();
            
            const labels = data.map(item => new Date(item.timestamp).toLocaleTimeString());
            const profits = data.map(item => item.profit);
            
            if (this.profitChart) {
                this.profitChart.data.labels = labels;
                this.profitChart.data.datasets[0].data = profits;
                this.profitChart.update();
            } else {
                this.initProfitChart(labels, profits);
            }
        } catch (error) {
            console.error("Error al actualizar el gráfico de ganancias:", error);
        }
    }
    
    async updateBalanceChart() {
        try {
            const response = await fetch('/api/balance-history');
            const data = await response.json();
            
            const labels = data.timestamps.map(timestamp => new Date(timestamp).toLocaleDateString());
            const datasets = Object.entries(data.balances).map(([exchange, balances], index) => {
                const color = Object.values(this.chartColors)[index % Object.values(this.chartColors).length];
                return {
                    label: exchange,
                    data: balances,
                    borderColor: color,
                    backgroundColor: this.transparentize(color, 0.5),
                    fill: false,
                    tension: 0.4
                };
            });
            
            if (this.balanceChart) {
                this.balanceChart.data.labels = labels;
                this.balanceChart.data.datasets = datasets;
                this.balanceChart.update();
            } else {
                this.initBalanceChart(labels, datasets);
            }
        } catch (error) {
            console.error("Error al actualizar el gráfico de balances:", error);
        }
    }
    
    async updateOpportunitiesChart() {
        try {
            const response = await fetch('/api/opportunities');
            const data = await response.json();
            
            const labels = data.map(item => `${item.pair} (${item.exchanges.join(' → ')})`);
            const values = data.map(item => item.profitPercentage);
            
            if (this.opportunitiesChart) {
                this.opportunitiesChart.data.labels = labels;
                this.opportunitiesChart.data.datasets[0].data = values;
                this.opportunitiesChart.update();
            } else {
                this.initOpportunitiesChart(labels, values);
            }
        } catch (error) {
            console.error("Error al actualizar el gráfico de oportunidades:", error);
        }
    }
    
    async updateRiskAnalysis() {
        try {
            const response = await fetch('/api/risk-analysis');
            const data = await response.json();
            
            // Actualizar indicadores de riesgo
            this.updateElement("market-volatility", `${data.marketVolatility}%`);
            this.updateElement("exchange-risk", `${data.exchangeRisk}%`);
            this.updateElement("liquidity-risk", `${data.liquidityRisk}%`);
            this.updateElement("overall-risk", `${data.overallRisk}%`);
            
            // Actualizar barras de progreso
            this.updateProgressBar("market-volatility-bar", data.marketVolatility);
            this.updateProgressBar("exchange-risk-bar", data.exchangeRisk);
            this.updateProgressBar("liquidity-risk-bar", data.liquidityRisk);
            this.updateProgressBar("overall-risk-bar", data.overallRisk);
            
            // Actualizar gráfico de riesgo
            const labels = ['Volatilidad', 'Riesgo de Exchange', 'Riesgo de Liquidez', 'Riesgo Total'];
            const values = [data.marketVolatility, data.exchangeRisk, data.liquidityRisk, data.overallRisk];
            
            if (this.riskChart) {
                this.riskChart.data.datasets[0].data = values;
                this.riskChart.update();
            } else {
                this.initRiskChart(labels, values);
            }
        } catch (error) {
            console.error("Error al actualizar el análisis de riesgo:", error);
        }
    }

    // ========== AGREGADO DASHBOARD: PANEL INTELIGENCIA ARTIFICIAL ==========
    async updateAIRecommendations() {
        try {
            const panel = document.getElementById("ai-recommendations-panel");
            if (!panel) return;
            const response = await fetch('/api/ia/recomendaciones');
            const data = await response.json();
            if (data && data.recomendaciones) {
                panel.innerHTML = data.recomendaciones.map(rec =>
                    `<div class="ai-recommendation">
                        <span class="icon">🤖</span>
                        <span class="ai-text">${rec.texto}</span>
                        <span class="ai-confidence">${rec.probabilidad ? `(${rec.probabilidad}%)` : ""}</span>
                    </div>`
                ).join("");
            }
        } catch (error) {
            // Silencioso, panel es opcional
        }
    }

    // ========== AGREGADO DASHBOARD: PANEL DE ANOMALÍAS ==========
    async updateAnomaliesPanel() {
        try {
            const panel = document.getElementById("anomalies-panel");
            if (!panel) return;
            const response = await fetch('/api/anomalias');
            const data = await response.json();
            if (data && data.anomalias) {
                panel.innerHTML = data.anomalias.map(a =>
                    `<div class="anomaly">
                        <span class="anomaly-type">${a.tipo}</span>
                        <span class="anomaly-desc">${a.descripcion}</span>
                        <span class="anomaly-time">${a.timestamp}</span>
                    </div>`
                ).join("");
            }
        } catch (error) {
            // Silencioso, panel es opcional
        }
    }

    // ========== AGREGADO DASHBOARD: PANEL DE COMISIONES ==========
    async updateCommissionPanel() {
        try {
            const panel = document.getElementById("commission-panel");
            if (!panel) return;
            const response = await fetch('/api/comisiones');
            const data = await response.json();
            if (data && data.comisiones) {
                panel.innerHTML = Object.entries(data.comisiones)
                    .map(([exchange, fees]) =>
                        `<div>
                            <strong>${exchange.toUpperCase()}:</strong>
                            <span>Taker: ${(fees.taker * 100).toFixed(2)}% | Maker: ${(fees.maker * 100).toFixed(2)}%</span>
                        </div>`
                    ).join("");
            }
        } catch (error) {
            // Silencioso
        }
    }

    // ========== AGREGADO DASHBOARD: PANEL AUTO-REBALANCE ==========
    async updateAutoRebalancePanel() {
        try {
            const panel = document.getElementById("auto-rebalance-panel");
            if (!panel) return;
            const response = await fetch('/api/rebalanceo/estado');
            const data = await response.json();
            panel.innerHTML = `<span>Auto-rebalance: <strong>${data.enabled ? "Activado" : "Desactivado"}</strong></span>`;
        } catch (error) { }
    }

    // ========== AGREGADO DASHBOARD: TOGGLE IA Y AUTO-REBALANCE ==========
    async toggleIA() {
        try {
            const response = await fetch('/api/toggle-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !this.lastIAEnabled })
            });
            const data = await response.json();
            this.lastIAEnabled = data.aiEnabled;
            this.updateAIRecommendations();
        } catch (e) { }
    }
    async toggleAutoRebalance() {
        try {
            const panel = document.getElementById("auto-rebalance-panel");
            const enabled = panel && panel.textContent.includes("Activado");
            const response = await fetch('/api/toggle-auto-rebalance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !enabled })
            });
            await response.json();
            this.updateAutoRebalancePanel();
        } catch (e) { }
    }
    // ========== FIN AGREGADOS DASHBOARD ==========

    initCharts() {
        // Los gráficos se inicializarán cuando lleguen los datos
    }
    
    initProfitChart(labels, data) {
        const ctx = document.getElementById('profit-chart').getContext('2d');
        this.profitChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ganancia ($)',
                    data: data,
                    borderColor: this.chartColors.green,
                    backgroundColor: this.transparentize(this.chartColors.green, 0.5),
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Historial de Ganancias'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `Ganancia: $${context.raw.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Tiempo'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Ganancia ($)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
    }
    
    initBalanceChart(labels, datasets) {
        const ctx = document.getElementById('balance-chart').getContext('2d');
        this.balanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Balances por Exchange'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: $${context.raw.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Fecha'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Balance ($)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
    }
    
    initOpportunitiesChart(labels, data) {
        const ctx = document.getElementById('opportunities-chart').getContext('2d');
        this.opportunitiesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Oportunidades de Arbitraje (%)',
                    data: data,
                    backgroundColor: this.transparentize(this.chartColors.blue, 0.5),
                    borderColor: this.chartColors.blue,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Oportunidades de Arbitraje'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Ganancia: ${context.raw.toFixed(2)}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Par / Exchanges'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Ganancia Potencial (%)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(2) + '%';
                            }
                        }
                    }
                }
            }
        });
    }
    
    initRiskChart(labels, data) {
        const ctx = document.getElementById('risk-chart').getContext('2d');
        this.riskChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Nivel de Riesgo',
                    data: data,
                    backgroundColor: this.transparentize(this.chartColors.red, 0.5),
                    borderColor: this.chartColors.red,
                    pointBackgroundColor: this.chartColors.red,
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: this.chartColors.red
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Análisis de Riesgo'
                    }
                },
                scales: {
                    r: {
                        angleLines: {
                            display: true
                        },
                        suggestedMin: 0,
                        suggestedMax: 100,
                        ticks: {
                            stepSize: 20,
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }
    
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
    
    updateProgressBar(id, value) {
        const progressBar = document.getElementById(id);
        if (progressBar) {
            progressBar.style.width = `${value}%`;
            
            // Cambiar color según el nivel de riesgo
            if (value < 30) {
                progressBar.className = "progress-bar bg-success";
            } else if (value < 70) {
                progressBar.className = "progress-bar bg-warning";
            } else {
                progressBar.className = "progress-bar bg-danger";
            }
        }
    }
    
    transparentize(color, alpha) {
        const rgbColor = color.replace('rgb(', '').replace(')', '').split(',');
        return `rgba(${rgbColor[0]}, ${rgbColor[1]}, ${rgbColor[2]}, ${alpha})`;
    }
    
    async startBot() {
        try {
            const response = await fetch('/api/start-bot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mode: this.isSimulationMode ? 'simulation' : 'production'
                })
            });
            
            const data = await response.json();
            if (data.success) {
                alert("Bot iniciado correctamente");
                this.updateBotStatus();
            } else {
                alert(`Error al iniciar el bot: ${data.error}`);
            }
        } catch (error) {
            console.error("Error al iniciar el bot:", error);
            alert("Error al iniciar el bot. Consulta la consola para más detalles.");
        }
    }
    
    async stopBot() {
        try {
            const response = await fetch('/api/stop-bot', {
                method: 'POST'
            });
            
            const data = await response.json();
            if (data.success) {
                alert("Bot detenido correctamente");
                this.updateBotStatus();
            } else {
                alert(`Error al detener el bot: ${data.error}`);
            }
        } catch (error) {
            console.error("Error al detener el bot:", error);
            alert("Error al detener el bot. Consulta la consola para más detalles.");
        }
    }
    
    async changeStrategy(strategy) {
        try {
            const response = await fetch('/api/change-strategy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ strategy })
            });
            
            const data = await response.json();
            if (data.success) {
                alert(`Estrategia cambiada a: ${strategy}`);
                this.updateBotStatus();
            } else {
                alert(`Error al cambiar la estrategia: ${data.error}`);
            }
        } catch (error) {
            console.error("Error al cambiar la estrategia:", error);
            alert("Error al cambiar la estrategia. Consulta la consola para más detalles.");
        }
    }
    
    async updateRiskSettings(settings) {
        try {
            const response = await fetch('/api/update-risk-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });
            
            const data = await response.json();
            if (data.success) {
                alert("Configuración de riesgo actualizada correctamente");
                this.updateRiskAnalysis();
            } else {
                alert(`Error al actualizar la configuración de riesgo: ${data.error}`);
            }
        } catch (error) {
            console.error("Error al actualizar la configuración de riesgo:", error);
            alert("Error al actualizar la configuración de riesgo. Consulta la consola para más detalles.");
        }
    }
    
    // Nueva función para alternar entre modo simulación y producción
    toggleMode() {
        this.isSimulationMode = !this.isSimulationMode;
        this.updateElement("current-mode", this.isSimulationMode ? "Simulación" : "Producción");
        
        // Cambiar el estilo del botón según el modo
        const toggleButton = document.getElementById("toggle-mode");
        if (toggleButton) {
            if (this.isSimulationMode) {
                toggleButton.classList.remove("btn-danger");
                toggleButton.classList.add("btn-warning");
                toggleButton.textContent = "Cambiar a Producción";
            } else {
                toggleButton.classList.remove("btn-warning");
                toggleButton.classList.add("btn-danger");
                toggleButton.textContent = "Cambiar a Simulación";
            }
        }
        
        // Si el bot está corriendo, reiniciarlo con el nuevo modo
        const botStatus = document.getElementById("bot-status");
        if (botStatus && botStatus.textContent === "Activo") {
            this.stopBot().then(() => {
                setTimeout(() => {
                    this.startBot();
                }, 1000);
            });
        }
    }
    
    // Nueva función para reequilibrar fondos entre exchanges
    async rebalanceFunds() {
        try {
            const response = await fetch('/api/rebalance-funds', {
                method: 'POST'
            });
            
            const data = await response.json();
            if (data.success) {
                alert("Reequilibrio de fondos iniciado correctamente");
                this.updateBotStatus();
            } else {
                alert(`Error al reequilibrar fondos: ${data.error}`);
            }
        } catch (error) {
            console.error("Error al reequilibrar fondos:", error);
            alert("Error al reequilibrar fondos. Consulta la consola para más detalles.");
        }
    }
}

// Inicializar el dashboard cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});