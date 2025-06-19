import { Chart } from "@/components/ui/chart"
// ========== DASHBOARD AVANZADO CON FUNCIONALIDADES COMPLETAS ==========

class AdvancedArbitrageDashboard {
  constructor() {
    this.token = localStorage.getItem("token")
    this.user = JSON.parse(localStorage.getItem("user") || "{}")
    this.socket = null
    this.charts = {}
    this.refreshIntervals = {}
    this.notifications = []

    this.botData = {
      isRunning: false,
      totalTrades: 0,
      successfulTrades: 0,
      totalProfit: 0,
      dailyTrades: 0,
      dailyProfit: 0,
      exposure: { total: 0 },
      opportunities: [],
      balances: { BINANCE: {}, KUCOIN: {} },
      aiSuggestions: null,
    }

    this.init()
  }

  async init() {
    console.log("🚀 Inicializando dashboard avanzado...")

    // Ocultar pantalla de carga
    setTimeout(() => {
      document.getElementById("loading-screen").style.display = "none"

      if (this.token) {
        this.showDashboard()
        this.initializeSocket()
        this.loadAllData()
      } else {
        this.showLogin()
      }
    }, 1000)

    this.setupEventListeners()
    this.initializeCharts()
    this.startAutoRefresh()
  }

  setupEventListeners() {
    // Login
    const loginForm = document.getElementById("loginForm")
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => this.handleLogin(e))
    }

    // Logout
    document.getElementById("logout-btn")?.addEventListener("click", () => this.logout())
    document.getElementById("logout-link")?.addEventListener("click", () => this.logout())

    // Sidebar
    document.getElementById("sidebar-toggle")?.addEventListener("click", () => this.toggleSidebar())

    // Navigation
    document.querySelectorAll(".nav-link[data-page]").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault()
        this.navigateToPage(link.dataset.page)
      })
    })

    // Bot controls
    document.getElementById("start-bot-btn")?.addEventListener("click", () => this.startBot())
    document.getElementById("stop-bot-btn")?.addEventListener("click", () => this.stopBot())

    // Refresh buttons
    document.getElementById("refresh-opportunities")?.addEventListener("click", () => this.loadOpportunities())
    document.getElementById("refresh-balances")?.addEventListener("click", () => this.loadBalances())
    document.getElementById("refresh-ai")?.addEventListener("click", () => this.loadAISuggestions())

    // Settings
    document.getElementById("save-settings")?.addEventListener("click", () => this.saveSettings())
    document.getElementById("reset-settings")?.addEventListener("click", () => this.resetSettings())

    // Manual trade execution
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("execute-trade-btn")) {
        const opportunityId = e.target.dataset.opportunityId
        this.executeManualTrade(opportunityId)
      }
    })
  }

  showLogin() {
    document.getElementById("login-form").style.display = "flex"
    document.getElementById("dashboard").style.display = "none"
  }

  showDashboard() {
    document.getElementById("login-form").style.display = "none"
    document.getElementById("dashboard").style.display = "block"

    if (this.user.username) {
      document.getElementById("user-name").textContent = this.user.username
    }
  }

  async handleLogin(e) {
    e.preventDefault()

    const username = document.getElementById("username").value
    const password = document.getElementById("password").value
    const loginBtn = document.getElementById("login-btn")
    const errorDiv = document.getElementById("login-error")

    loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Iniciando sesión...'
    loginBtn.disabled = true
    errorDiv.style.display = "none"

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (response.ok) {
        this.token = data.token
        this.user = data.user
        localStorage.setItem("token", this.token)
        localStorage.setItem("user", JSON.stringify(this.user))

        this.showDashboard()
        this.initializeSocket()
        this.loadAllData()
        this.showNotification("Bienvenido al dashboard", "success")
      } else {
        errorDiv.textContent = data.message || "Error de autenticación"
        errorDiv.style.display = "block"
      }
    } catch (error) {
      errorDiv.textContent = "Error de conexión"
      errorDiv.style.display = "block"
    } finally {
      loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Iniciar Sesión'
      loginBtn.disabled = false
    }
  }

  logout() {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    this.token = null
    this.user = {}

    if (this.socket) this.socket.disconnect()
    this.clearRefreshIntervals()
    this.showLogin()
  }

  toggleSidebar() {
    const sidebar = document.getElementById("sidebar")
    const header = document.getElementById("header")
    const mainContent = document.getElementById("main-content")
    const toggleIcon = document.querySelector("#sidebar-toggle i")

    sidebar.classList.toggle("sidebar-collapsed")
    header.classList.toggle("header-expanded")
    mainContent.classList.toggle("main-content-expanded")

    if (sidebar.classList.contains("sidebar-collapsed")) {
      toggleIcon.className = "bi bi-chevron-right"
      document.querySelectorAll(".nav-text, #sidebar-text").forEach((el) => {
        el.style.display = "none"
      })
    } else {
      toggleIcon.className = "bi bi-chevron-left"
      document.querySelectorAll(".nav-text, #sidebar-text").forEach((el) => {
        el.style.display = "inline"
      })
    }
  }

  navigateToPage(page) {
    // Update navigation
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.remove("active")
    })
    document.querySelector(`[data-page="${page}"]`)?.classList.add("active")

    // Update page title
    const titles = {
      dashboard: "Dashboard Principal",
      opportunities: "Oportunidades de Arbitraje",
      "ai-advisor": "Asesor de IA",
      reports: "Reportes y Análisis",
      settings: "Configuración del Bot",
    }

    document.getElementById("page-title").textContent = titles[page] || "Dashboard"

    // Show/hide pages
    document.querySelectorAll(".page-content").forEach((pageEl) => {
      pageEl.style.display = "none"
    })

    const targetPage = document.getElementById(`page-${page}`)
    if (targetPage) {
      targetPage.style.display = "block"

      // Load page-specific data
      this.loadPageData(page)
    }
  }

  async loadPageData(page) {
    switch (page) {
      case "opportunities":
        await this.loadOpportunities()
        break
      case "ai-advisor":
        await this.loadAISuggestions()
        break
      case "reports":
        await this.loadReports()
        this.updateReportsCharts()
        break
      case "settings":
        this.loadSettings()
        break
    }
  }

  initializeSocket() {
    if (!this.token) return

    this.socket = io()

    this.socket.on("connect", () => {
      console.log("✅ Conectado al servidor")
      this.showNotification("Conectado al servidor", "success")
    })

    this.socket.on("status_update", (data) => {
      this.updateBotStatus(data)
    })

    this.socket.on("new_opportunity", (data) => {
      this.addNewOpportunity(data)
      this.showNotification(`Nueva oportunidad: ${data.pair} (${data.finalProfit.toFixed(2)}%)`, "info")
    })

    this.socket.on("balance_update", (data) => {
      this.updateBalances(data)
    })

    this.socket.on("trade_executed", (data) => {
      this.showNotification(
        `Trade ejecutado: ${data.profit > 0 ? "Ganancia" : "Pérdida"} de ${Math.abs(data.profit).toFixed(4)} USDT`,
        data.profit > 0 ? "success" : "warning",
      )
    })

    this.socket.on("disconnect", () => {
      console.log("❌ Desconectado del servidor")
      this.showNotification("Desconectado del servidor", "warning")
    })
  }

  async loadAllData() {
    try {
      await Promise.all([this.loadBotStatus(), this.loadOpportunities(), this.loadBalances(), this.loadAISuggestions()])
    } catch (error) {
      console.error("Error cargando datos:", error)
      this.showNotification("Error cargando datos", "danger")
    }
  }

  async apiCall(endpoint, options = {}) {
    const defaultOptions = {
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
    }

    try {
      const response = await fetch(endpoint, { ...defaultOptions, ...options })

      if (response.status === 401) {
        this.logout()
        throw new Error("No autorizado")
      }

      return await response.json()
    } catch (error) {
      console.error(`Error en API call ${endpoint}:`, error)
      throw error
    }
  }

  async loadBotStatus() {
    try {
      const data = await this.apiCall("/api/status")
      this.updateBotStatus(data)
    } catch (error) {
      console.error("Error cargando estado del bot:", error)
    }
  }

  updateBotStatus(data) {
    this.botData = { ...this.botData, ...data }
    const isRunning = data.botState?.isRunning || false

    // Update status indicators
    const statusBadge = document.getElementById("bot-status-badge")
    const statusText = document.getElementById("bot-status-text")
    const statusDescription = document.getElementById("bot-status-description")
    const runningIndicator = document.getElementById("bot-running-indicator")
    const startBtn = document.getElementById("start-bot-btn")
    const stopBtn = document.getElementById("stop-bot-btn")

    if (isRunning) {
      statusBadge.className = "badge bg-success me-2"
      statusBadge.textContent = "Activo"
      statusText.textContent = "Bot en ejecución"
      statusDescription.innerHTML =
        '<span class="text-success"><i class="bi bi-play-circle me-1"></i>En ejecución</span>'
      runningIndicator.style.display = "block"
      startBtn.style.display = "none"
      stopBtn.style.display = "inline-block"
    } else {
      statusBadge.className = "badge bg-danger me-2"
      statusBadge.textContent = "Inactivo"
      statusText.textContent = "Bot detenido"
      statusDescription.innerHTML = '<span class="text-danger"><i class="bi bi-stop-circle me-1"></i>Detenido</span>'
      runningIndicator.style.display = "none"
      startBtn.style.display = "inline-block"
      stopBtn.style.display = "none"
    }

    // Update metrics
    if (data.botState) {
      this.updateElement("total-trades", data.botState.totalTrades || 0)
      this.updateElement("daily-trades", data.botState.dailyTrades || 0)
      this.updateElement("total-profit", `${(data.botState.totalProfit || 0).toFixed(4)} USDT`)
      this.updateElement("daily-profit", `${(data.botState.dailyProfit || 0).toFixed(4)} USDT`)
      this.updateElement("successful-trades", data.botState.successfulTrades || 0)

      const successRate =
        data.botState.totalTrades > 0
          ? ((data.botState.successfulTrades / data.botState.totalTrades) * 100).toFixed(1)
          : 0
      this.updateElement("success-rate", `${successRate}%`)
    }

    if (data.exposure) {
      this.updateElement("total-exposure", `$${(data.exposure.total || 0).toFixed(2)}`)
    }

    // Update charts if visible
    this.updateDashboardCharts(data)
  }

  updateElement(id, value) {
    const element = document.getElementById(id)
    if (element) element.textContent = value
  }

  async startBot() {
    const startBtn = document.getElementById("start-bot-btn")
    const originalText = startBtn.innerHTML

    startBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Iniciando...'
    startBtn.disabled = true

    try {
      const result = await this.apiCall("/api/bot/start", { method: "POST" })

      if (result.success) {
        this.showNotification("Bot iniciado correctamente", "success")
        this.loadBotStatus()
      } else {
        this.showNotification(`Error: ${result.message}`, "danger")
      }
    } catch (error) {
      this.showNotification("Error iniciando el bot", "danger")
    } finally {
      startBtn.innerHTML = originalText
      startBtn.disabled = false
    }
  }

  async stopBot() {
    const stopBtn = document.getElementById("stop-bot-btn")
    const originalText = stopBtn.innerHTML

    stopBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Deteniendo...'
    stopBtn.disabled = true

    try {
      const result = await this.apiCall("/api/bot/stop", { method: "POST" })

      if (result.success) {
        this.showNotification("Bot detenido correctamente", "success")
        this.loadBotStatus()
      } else {
        this.showNotification(`Error: ${result.message}`, "danger")
      }
    } catch (error) {
      this.showNotification("Error deteniendo el bot", "danger")
    } finally {
      stopBtn.innerHTML = originalText
      stopBtn.disabled = false
    }
  }

  async loadOpportunities() {
    try {
      const opportunities = await this.apiCall("/api/opportunities")
      this.botData.opportunities = opportunities
      this.updateOpportunitiesTable(opportunities)
    } catch (error) {
      console.error("Error cargando oportunidades:", error)
    }
  }

  updateOpportunitiesTable(opportunities) {
    const tbody = document.getElementById("opportunities-table")
    const detailedTbody = document.getElementById("detailed-opportunities-table")

    if (!opportunities || opportunities.length === 0) {
      const emptyRow = `
        <tr>
          <td colspan="7" class="text-center py-4">
            <i class="bi bi-search fs-4 text-muted"></i>
            <p class="mt-2 mb-0">No hay oportunidades disponibles</p>
          </td>
        </tr>
      `
      if (tbody) tbody.innerHTML = emptyRow
      if (detailedTbody) detailedTbody.innerHTML = emptyRow
      return
    }

    const createRow = (opp, detailed = false) => `
      <tr>
        <td>
          <strong>${opp.pair}</strong>
          ${detailed ? `<br><small class="text-muted">Riesgo: ${opp.riskLevel || "MEDIUM"}</small>` : ""}
        </td>
        <td>
          <span class="badge bg-primary me-1">${opp.buyExchange}</span>
          <i class="bi bi-arrow-right"></i>
          <span class="badge bg-secondary ms-1">${opp.sellExchange}</span>
        </td>
        <td class="text-success">
          <strong>${opp.finalProfit.toFixed(3)}%</strong>
          ${detailed ? `<br><small class="text-muted">Bruto: ${opp.grossProfit.toFixed(3)}%</small>` : ""}
        </td>
        <td>
          <div class="progress" style="height: 6px;">
            <div class="progress-bar ${opp.confidence > 0.7 ? "bg-success" : opp.confidence > 0.4 ? "bg-warning" : "bg-danger"}" 
                 style="width: ${opp.confidence * 100}%"></div>
          </div>
          <small>${(opp.confidence * 100).toFixed(1)}%</small>
        </td>
        <td>
          <strong>${opp.tradeAmount.toFixed(2)} USDT</strong>
          ${detailed ? `<br><small class="text-muted">Max: ${opp.pair.maxTradeAmount || "N/A"}</small>` : ""}
        </td>
        <td>
          <small>${new Date(opp.timestamp).toLocaleTimeString()}</small>
          ${detailed ? `<br><small class="text-muted">${new Date(opp.timestamp).toLocaleDateString()}</small>` : ""}
        </td>
        ${
          detailed
            ? `
          <td>
            <button class="btn btn-sm btn-success execute-trade-btn" data-opportunity-id="${opp.id || Date.now()}">
              <i class="bi bi-play-fill me-1"></i>
              Ejecutar
            </button>
          </td>
        `
            : ""
        }
      </tr>
    `

    if (tbody) {
      tbody.innerHTML = opportunities
        .slice(0, 5)
        .map((opp) => createRow(opp))
        .join("")
    }

    if (detailedTbody) {
      detailedTbody.innerHTML = opportunities.map((opp) => createRow(opp, true)).join("")
    }
  }

  addNewOpportunity(opportunity) {
    this.botData.opportunities.unshift(opportunity)
    this.botData.opportunities = this.botData.opportunities.slice(0, 20) // Keep only last 20
    this.updateOpportunitiesTable(this.botData.opportunities)
  }

  async executeManualTrade(opportunityId) {
    try {
      const result = await this.apiCall("/api/bot/execute", {
        method: "POST",
        body: JSON.stringify({ opportunityId }),
      })

      if (result.success) {
        this.showNotification(`Trade ejecutado exitosamente. Profit: ${result.profit?.toFixed(4)} USDT`, "success")
      } else {
        this.showNotification(`Error ejecutando trade: ${result.message}`, "danger")
      }
    } catch (error) {
      this.showNotification("Error ejecutando trade manual", "danger")
    }
  }

  async loadBalances() {
    try {
      const balances = await this.apiCall("/api/balances")
      this.botData.balances = balances
      this.updateBalances(balances)
    } catch (error) {
      console.error("Error cargando balances:", error)
    }
  }

  updateBalances(balances) {
    this.updateExchangeBalances("binance-balances", balances.BINANCE || {})
    this.updateExchangeBalances("kucoin-balances", balances.KUCOIN || {})

    // Update balance charts
    this.updateBalanceCharts(balances)
  }

  updateExchangeBalances(tableId, balances) {
    const tbody = document.getElementById(tableId)
    if (!tbody) return

    const balanceEntries = Object.entries(balances).filter(([_, balance]) => balance.total > 0)

    if (balanceEntries.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center py-4">
            <i class="bi bi-wallet2 fs-4 text-muted"></i>
            <p class="mt-2 mb-0">No hay balances disponibles</p>
          </td>
        </tr>
      `
      return
    }

    tbody.innerHTML = balanceEntries
      .map(
        ([asset, balance]) => `
      <tr>
        <td>
          <strong>${asset}</strong>
          <small class="text-muted d-block">${this.getAssetName(asset)}</small>
        </td>
        <td>${balance.free.toFixed(6)}</td>
        <td>${balance.locked.toFixed(6)}</td>
        <td>
          <strong>${balance.total.toFixed(6)}</strong>
          <small class="text-muted d-block">≈ $${(balance.total * this.getAssetPrice(asset)).toFixed(2)}</small>
        </td>
      </tr>
    `,
      )
      .join("")
  }

  getAssetName(asset) {
    const names = {
      USDT: "Tether",
      POL: "Polygon",
      USDC: "USD Coin",
      BTC: "Bitcoin",
      ETH: "Ethereum",
    }
    return names[asset] || asset
  }

  getAssetPrice(asset) {
    // Simplified price lookup
    const prices = {
      USDT: 1,
      USDC: 1,
      POL: 0.45,
      BTC: 45000,
      ETH: 3000,
    }
    return prices[asset] || 1
  }

  async loadAISuggestions() {
    try {
      const suggestions = await this.apiCall("/api/ai/suggestions")
      this.botData.aiSuggestions = suggestions
      this.updateAISuggestions(suggestions)
    } catch (error) {
      console.error("Error cargando sugerencias de IA:", error)
    }
  }

  updateAISuggestions(suggestions) {
    // Update general recommendations
    const recommendationsContainer = document.getElementById("ai-recommendations")
    if (recommendationsContainer && suggestions.generalRecommendations) {
      recommendationsContainer.innerHTML = suggestions.generalRecommendations
        .map(
          (rec) => `
        <div class="ai-recommendation ${rec.importance.toLowerCase()}">
          <div class="d-flex align-items-center mb-2">
            <span class="badge bg-${rec.importance === "HIGH" ? "danger" : rec.importance === "MEDIUM" ? "warning" : "info"} me-2">
              ${rec.importance === "HIGH" ? "Alta Prioridad" : rec.importance === "MEDIUM" ? "Media Prioridad" : "Baja Prioridad"}
            </span>
            <strong>${rec.type.replace("_", " ")}</strong>
          </div>
          <p class="mb-0">${rec.message}</p>
        </div>
      `,
        )
        .join("")
    }

    // Update market insights
    const marketInsights = document.getElementById("market-insights")
    if (marketInsights && suggestions.marketInsights) {
      const insights = suggestions.marketInsights
      marketInsights.innerHTML = `
        <div class="row">
          <div class="col-md-6">
            <h6>Volatilidad del Mercado</h6>
            <div class="progress mb-3">
              <div class="progress-bar ${insights.marketVolatility > 4 ? "bg-danger" : insights.marketVolatility > 2 ? "bg-warning" : "bg-success"}" 
                   style="width: ${Math.min(insights.marketVolatility * 10, 100)}%"></div>
            </div>
            <small>${insights.marketVolatility.toFixed(2)}% - ${insights.marketVolatility > 4 ? "Alta" : insights.marketVolatility > 2 ? "Moderada" : "Baja"}</small>
          </div>
          <div class="col-md-6">
            <h6>Mejores Horas de Trading</h6>
            ${
              insights.bestTradingHours
                ?.slice(0, 3)
                .map(
                  (hour) => `
              <div class="d-flex justify-content-between">
                <span>${hour.formattedHour}</span>
                <span class="text-success">${(hour.successRate * 100).toFixed(1)}%</span>
              </div>
            `,
                )
                .join("") || '<p class="text-muted">No hay datos disponibles</p>'
            }
          </div>
        </div>
      `
    }
  }

  async loadReports() {
    try {
      const report = await this.apiCall("/api/report")
      this.updateReportsPage(report)
    } catch (error) {
      console.error("Error cargando reportes:", error)
    }
  }

  updateReportsPage(report) {
    // Update performance metrics
    const performanceMetrics = document.getElementById("performance-metrics")
    if (performanceMetrics && report.performance) {
      const perf = report.performance
      performanceMetrics.innerHTML = `
        <div class="row">
          <div class="col-md-3">
            <div class="text-center">
              <h4 class="text-primary">${perf.totalTrades}</h4>
              <small>Total Trades</small>
            </div>
          </div>
          <div class="col-md-3">
            <div class="text-center">
              <h4 class="text-success">${perf.successRate.toFixed(1)}%</h4>
              <small>Tasa de Éxito</small>
            </div>
          </div>
          <div class="col-md-3">
            <div class="text-center">
              <h4 class="text-info">${perf.totalProfit.toFixed(4)}</h4>
              <small>Profit Total (USDT)</small>
            </div>
          </div>
          <div class="col-md-3">
            <div class="text-center">
              <h4 class="text-warning">${(perf.avgExecutionTime / 1000).toFixed(2)}s</h4>
              <small>Tiempo Promedio</small>
            </div>
          </div>
        </div>
      `
    }
  }

  initializeCharts() {
    // Initialize Chart.js charts
    this.initializeProfitChart()
    this.initializeBalanceChart()
    this.initializeOpportunityChart()
  }

  initializeProfitChart() {
    const ctx = document.getElementById("profit-chart")
    if (!ctx) return

    this.charts.profit = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Profit Acumulado (USDT)",
            data: [],
            borderColor: "#06d6a0",
            backgroundColor: "rgba(6, 214, 160, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: "top" },
        },
        scales: {
          y: { beginAtZero: true },
        },
      },
    })
  }

  initializeBalanceChart() {
    const ctx = document.getElementById("balance-chart")
    if (!ctx) return

    this.charts.balance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Binance", "KuCoin"],
        datasets: [
          {
            data: [0, 0],
            backgroundColor: ["#3a86ff", "#8338ec"],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom" },
        },
      },
    })
  }

  initializeOpportunityChart() {
    const ctx = document.getElementById("opportunity-chart")
    if (!ctx) return

    this.charts.opportunity = new Chart(ctx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Oportunidades por Par",
            data: [],
            backgroundColor: "#ffd166",
            borderColor: "#ffb347",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: { beginAtZero: true },
        },
      },
    })
  }

  updateDashboardCharts(data) {
    // Update profit chart with new data
    if (this.charts.profit && data.botState) {
      const now = new Date().toLocaleTimeString()
      this.charts.profit.data.labels.push(now)
      this.charts.profit.data.datasets[0].data.push(data.botState.totalProfit || 0)

      // Keep only last 20 points
      if (this.charts.profit.data.labels.length > 20) {
        this.charts.profit.data.labels.shift()
        this.charts.profit.data.datasets[0].data.shift()
      }

      this.charts.profit.update()
    }
  }

  updateBalanceCharts(balances) {
    if (this.charts.balance) {
      const binanceTotal = Object.values(balances.BINANCE || {}).reduce((sum, balance) => sum + (balance.total || 0), 0)
      const kucoinTotal = Object.values(balances.KUCOIN || {}).reduce((sum, balance) => sum + (balance.total || 0), 0)

      this.charts.balance.data.datasets[0].data = [binanceTotal, kucoinTotal]
      this.charts.balance.update()
    }
  }

  updateReportsCharts() {
    // Update opportunity chart
    if (this.charts.opportunity && this.botData.opportunities) {
      const pairCounts = {}
      this.botData.opportunities.forEach((opp) => {
        pairCounts[opp.pair] = (pairCounts[opp.pair] || 0) + 1
      })

      this.charts.opportunity.data.labels = Object.keys(pairCounts)
      this.charts.opportunity.data.datasets[0].data = Object.values(pairCounts)
      this.charts.opportunity.update()
    }
  }

  loadSettings() {
    // Load current settings
    const settings = {
      dryRun: true,
      checkInterval: 10,
      maxDailyTrades: 20,
      minProfit: 0.3,
      maxExposure: 200,
    }

    document.getElementById("dry-run").checked = settings.dryRun
    document.getElementById("check-interval").value = settings.checkInterval
    document.getElementById("max-daily-trades").value = settings.maxDailyTrades
    document.getElementById("min-profit").value = settings.minProfit
    document.getElementById("max-exposure").value = settings.maxExposure
  }

  async saveSettings() {
    const settings = {
      BOT: {
        DRY_RUN: document.getElementById("dry-run").checked,
        CHECK_INTERVAL: Number.parseInt(document.getElementById("check-interval").value),
        MAX_DAILY_TRADES: Number.parseInt(document.getElementById("max-daily-trades").value),
      },
      RISK_MANAGEMENT: {
        MAX_TOTAL_EXPOSURE: Number.parseFloat(document.getElementById("max-exposure").value),
      },
      TRADING_PAIRS: [
        {
          symbol: "POL/USDT",
          minProfit: Number.parseFloat(document.getElementById("min-profit").value),
        },
      ],
    }

    try {
      const result = await this.apiCall("/api/bot/settings", {
        method: "POST",
        body: JSON.stringify({ settings }),
      })

      if (result.success) {
        this.showNotification("Configuración guardada correctamente", "success")
      } else {
        this.showNotification(`Error: ${result.message}`, "danger")
      }
    } catch (error) {
      this.showNotification("Error guardando configuración", "danger")
    }
  }

  resetSettings() {
    if (confirm("¿Está seguro de que desea restablecer la configuración por defecto?")) {
      this.loadSettings()
      this.showNotification("Configuración restablecida", "info")
    }
  }

  startAutoRefresh() {
    // Auto-refresh data every 30 seconds
    this.refreshIntervals.status = setInterval(() => {
      if (this.token) this.loadBotStatus()
    }, 30000)

    // Auto-refresh opportunities every 15 seconds
    this.refreshIntervals.opportunities = setInterval(() => {
      if (this.token) this.loadOpportunities()
    }, 15000)

    // Auto-refresh balances every 60 seconds
    this.refreshIntervals.balances = setInterval(() => {
      if (this.token) this.loadBalances()
    }, 60000)
  }

  clearRefreshIntervals() {
    Object.values(this.refreshIntervals).forEach((interval) => {
      clearInterval(interval)
    })
    this.refreshIntervals = {}
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div")
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`
    notification.style.cssText = "top: 20px; right: 20px; z-index: 9999; min-width: 300px;"
    notification.innerHTML = `
      <i class="bi bi-${type === "success" ? "check-circle" : type === "danger" ? "exclamation-triangle" : type === "warning" ? "exclamation-circle" : "info-circle"} me-2"></i>
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `

    document.body.appendChild(notification)

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove()
      }
    }, 5000)

    // Store notification
    this.notifications.unshift({ message, type, timestamp: Date.now() })
    this.notifications = this.notifications.slice(0, 50) // Keep only last 50
  }
}

// Initialize advanced dashboard
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Inicializando dashboard avanzado...")
  new AdvancedArbitrageDashboard()
})
