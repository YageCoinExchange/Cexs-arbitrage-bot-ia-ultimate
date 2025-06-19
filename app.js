// ========== APLICACIÓN PRINCIPAL DEL DASHBOARD ==========

class ArbitrageBotDashboard {
  constructor() {
    this.token = localStorage.getItem("token")
    this.user = JSON.parse(localStorage.getItem("user") || "{}")
    this.socket = null
    this.botData = {
      isRunning: false,
      totalTrades: 0,
      successfulTrades: 0,
      totalProfit: 0,
      dailyTrades: 0,
      dailyProfit: 0,
      exposure: { total: 0 },
    }

    this.init()
  }

  async init() {
    console.log("🚀 Inicializando dashboard...")

    // Ocultar loading screen después de un tiempo más corto
    setTimeout(() => {
      console.log("📱 Mostrando interfaz...")
      document.getElementById("loading-screen").style.display = "none"

      if (this.token) {
        console.log("✅ Token encontrado, mostrando dashboard")
        this.showDashboard()
        this.initializeSocket()
        this.loadInitialData()
      } else {
        console.log("🔑 No hay token, mostrando login")
        this.showLogin()
      }
    }, 500) // Reducido de 1000ms a 500ms

    this.setupEventListeners()
  }

  setupEventListeners() {
    console.log("🎯 Configurando event listeners...")

    // Login form
    const loginForm = document.getElementById("loginForm")
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => this.handleLogin(e))
      console.log("✅ Login form listener configurado")
    }

    // Logout buttons
    const logoutBtn = document.getElementById("logout-btn")
    const logoutLink = document.getElementById("logout-link")

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => this.logout())
      console.log("✅ Logout button listener configurado")
    }

    if (logoutLink) {
      logoutLink.addEventListener("click", () => this.logout())
      console.log("✅ Logout link listener configurado")
    }

    // Sidebar toggle
    const sidebarToggle = document.getElementById("sidebar-toggle")
    if (sidebarToggle) {
      sidebarToggle.addEventListener("click", () => this.toggleSidebar())
      console.log("✅ Sidebar toggle listener configurado")
    }

    // Navigation
    document.querySelectorAll(".nav-link[data-page]").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault()
        this.navigateToPage(link.dataset.page)
      })
    })
    console.log("✅ Navigation listeners configurados")

    // Bot controls
    const startBtn = document.getElementById("start-bot-btn")
    const stopBtn = document.getElementById("stop-bot-btn")

    if (startBtn) {
      startBtn.addEventListener("click", () => this.startBot())
      console.log("✅ Start bot listener configurado")
    }

    if (stopBtn) {
      stopBtn.addEventListener("click", () => this.stopBot())
      console.log("✅ Stop bot listener configurado")
    }

    // Refresh buttons
    const refreshBtn = document.getElementById("refresh-opportunities")
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.loadOpportunities())
      console.log("✅ Refresh opportunities listener configurado")
    }
  }

  showLogin() {
    console.log("🔑 Mostrando pantalla de login")
    const loginForm = document.getElementById("login-form")
    const dashboard = document.getElementById("dashboard")

    if (loginForm) loginForm.style.display = "flex"
    if (dashboard) dashboard.style.display = "none"
  }

  showDashboard() {
    console.log("📊 Mostrando dashboard")
    const loginForm = document.getElementById("login-form")
    const dashboard = document.getElementById("dashboard")

    if (loginForm) loginForm.style.display = "none"
    if (dashboard) dashboard.style.display = "block"

    if (this.user.username) {
      const userNameEl = document.getElementById("user-name")
      if (userNameEl) {
        userNameEl.textContent = this.user.username
      }
    }
  }

  async handleLogin(e) {
    e.preventDefault()
    console.log("🔐 Intentando login...")

    const username = document.getElementById("username").value
    const password = document.getElementById("password").value
    const loginBtn = document.getElementById("login-btn")
    const errorDiv = document.getElementById("login-error")

    // Show loading
    if (loginBtn) {
      loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Iniciando sesión...'
      loginBtn.disabled = true
    }

    if (errorDiv) {
      errorDiv.style.display = "none"
    }

    try {
      console.log("📡 Enviando credenciales al servidor...")
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()
      console.log("📨 Respuesta del servidor:", response.status)

      if (response.ok) {
        console.log("✅ Login exitoso")
        this.token = data.token
        this.user = data.user
        localStorage.setItem("token", this.token)
        localStorage.setItem("user", JSON.stringify(this.user))

        this.showDashboard()
        this.initializeSocket()
        this.loadInitialData()
      } else {
        console.log("❌ Error en login:", data.message)
        if (errorDiv) {
          errorDiv.textContent = data.message || "Error de autenticación"
          errorDiv.style.display = "block"
        }
      }
    } catch (error) {
      console.error("❌ Error de conexión:", error)
      if (errorDiv) {
        errorDiv.textContent = "Error de conexión"
        errorDiv.style.display = "block"
      }
    } finally {
      if (loginBtn) {
        loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Iniciar Sesión'
        loginBtn.disabled = false
      }
    }
  }

  logout() {
    console.log("👋 Cerrando sesión...")
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    this.token = null
    this.user = {}

    if (this.socket) {
      this.socket.disconnect()
    }

    this.showLogin()
  }

  toggleSidebar() {
    console.log("📱 Toggle sidebar")
    const sidebar = document.getElementById("sidebar")
    const header = document.getElementById("header")
    const mainContent = document.getElementById("main-content")
    const toggleIcon = document.querySelector("#sidebar-toggle i")

    if (sidebar) sidebar.classList.toggle("sidebar-collapsed")
    if (header) header.classList.toggle("header-expanded")
    if (mainContent) mainContent.classList.toggle("main-content-expanded")

    if (sidebar && sidebar.classList.contains("sidebar-collapsed")) {
      if (toggleIcon) toggleIcon.className = "bi bi-chevron-right"
      document.querySelectorAll(".nav-text, #sidebar-text").forEach((el) => {
        el.style.display = "none"
      })
    } else {
      if (toggleIcon) toggleIcon.className = "bi bi-chevron-left"
      document.querySelectorAll(".nav-text, #sidebar-text").forEach((el) => {
        el.style.display = "inline"
      })
    }
  }

  navigateToPage(page) {
    console.log("🧭 Navegando a:", page)

    // Update navigation
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.remove("active")
    })
    const activeLink = document.querySelector(`[data-page="${page}"]`)
    if (activeLink) {
      activeLink.classList.add("active")
    }

    // Update page title
    const titles = {
      dashboard: "Dashboard",
      opportunities: "Oportunidades de Arbitraje",
      "ai-advisor": "Asesor de IA",
      reports: "Reportes y Análisis",
      settings: "Configuración",
    }

    const pageTitle = document.getElementById("page-title")
    if (pageTitle) {
      pageTitle.textContent = titles[page] || "Dashboard"
    }

    // Show/hide pages
    document.querySelectorAll(".page-content").forEach((pageEl) => {
      pageEl.style.display = "none"
    })

    const targetPage = document.getElementById(`page-${page}`)
    if (targetPage) {
      targetPage.style.display = "block"
    }
  }

  initializeSocket() {
    console.log("🔌 Inicializando Socket.IO...")

    try {
      this.socket = io()

      this.socket.on("connect", () => {
        console.log("✅ Conectado al servidor via Socket.IO")
      })

      this.socket.on("status_update", (data) => {
        console.log("📊 Actualización de estado recibida")
        this.updateBotStatus(data)
      })

      this.socket.on("new_opportunity", (data) => {
        console.log("🎯 Nueva oportunidad:", data)
        this.loadOpportunities()
      })

      this.socket.on("balance_update", (data) => {
        console.log("💰 Actualización de balances")
        this.updateBalances(data)
      })

      this.socket.on("disconnect", () => {
        console.log("❌ Desconectado del servidor")
      })

      this.socket.on("connect_error", (error) => {
        console.error("❌ Error de conexión Socket.IO:", error)
      })
    } catch (error) {
      console.error("❌ Error inicializando Socket.IO:", error)
    }
  }

  async loadInitialData() {
    console.log("📡 Cargando datos iniciales...")

    try {
      await Promise.all([this.loadBotStatus(), this.loadOpportunities(), this.loadBalances()])
      console.log("✅ Datos iniciales cargados")
    } catch (error) {
      console.error("❌ Error cargando datos iniciales:", error)
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
        console.log("🔑 Token expirado, redirigiendo a login")
        this.logout()
        throw new Error("No autorizado")
      }

      return await response.json()
    } catch (error) {
      console.error(`❌ Error en API call ${endpoint}:`, error)
      throw error
    }
  }

  async loadBotStatus() {
    try {
      console.log("📊 Cargando estado del bot...")
      const data = await this.apiCall("/api/status")
      this.updateBotStatus(data)
    } catch (error) {
      console.error("❌ Error cargando estado del bot:", error)
    }
  }

  updateBotStatus(data) {
    console.log("🔄 Actualizando estado del bot")
    this.botData = { ...this.botData, ...data }

    // Update bot status indicators
    const isRunning = data.botState?.isRunning || false

    // Update sidebar status
    const statusBadge = document.getElementById("bot-status-badge")
    const statusText = document.getElementById("bot-status-text")
    const statusDescription = document.getElementById("bot-status-description")
    const runningIndicator = document.getElementById("bot-running-indicator")
    const startBtn = document.getElementById("start-bot-btn")
    const stopBtn = document.getElementById("stop-bot-btn")

    if (isRunning) {
      if (statusBadge) {
        statusBadge.className = "badge bg-success me-2"
        statusBadge.textContent = "Activo"
      }
      if (statusText) statusText.textContent = "Bot en ejecución"
      if (statusDescription) {
        statusDescription.innerHTML =
          '<span class="text-success"><i class="bi bi-play-circle me-1"></i>En ejecución</span>'
      }
      if (runningIndicator) runningIndicator.style.display = "block"
      if (startBtn) startBtn.style.display = "none"
      if (stopBtn) stopBtn.style.display = "inline-block"
    } else {
      if (statusBadge) {
        statusBadge.className = "badge bg-danger me-2"
        statusBadge.textContent = "Inactivo"
      }
      if (statusText) statusText.textContent = "Bot detenido"
      if (statusDescription) {
        statusDescription.innerHTML = '<span class="text-danger"><i class="bi bi-stop-circle me-1"></i>Detenido</span>'
      }
      if (runningIndicator) runningIndicator.style.display = "none"
      if (startBtn) startBtn.style.display = "inline-block"
      if (stopBtn) stopBtn.style.display = "none"
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
  }

  updateElement(id, value) {
    const element = document.getElementById(id)
    if (element) {
      element.textContent = value
    }
  }

  async startBot() {
    console.log("▶️ Iniciando bot...")
    const startBtn = document.getElementById("start-bot-btn")
    const originalText = startBtn ? startBtn.innerHTML : ""

    if (startBtn) {
      startBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Iniciando...'
      startBtn.disabled = true
    }

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
      if (startBtn) {
        startBtn.innerHTML = originalText
        startBtn.disabled = false
      }
    }
  }

  async stopBot() {
    console.log("⏹️ Deteniendo bot...")
    const stopBtn = document.getElementById("stop-bot-btn")
    const originalText = stopBtn ? stopBtn.innerHTML : ""

    if (stopBtn) {
      stopBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Deteniendo...'
      stopBtn.disabled = true
    }

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
      if (stopBtn) {
        stopBtn.innerHTML = originalText
        stopBtn.disabled = false
      }
    }
  }

  async loadOpportunities() {
    try {
      console.log("🎯 Cargando oportunidades...")
      const opportunities = await this.apiCall("/api/opportunities")
      this.updateOpportunitiesTable(opportunities)
    } catch (error) {
      console.error("❌ Error cargando oportunidades:", error)
    }
  }

  updateOpportunitiesTable(opportunities) {
    const tbody = document.getElementById("opportunities-table")
    if (!tbody) return

    if (!opportunities || opportunities.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4">
            No hay oportunidades recientes
          </td>
        </tr>
      `
      return
    }

    tbody.innerHTML = opportunities
      .slice(0, 5)
      .map(
        (opp) => `
      <tr>
        <td>${opp.pair}</td>
        <td>${opp.buyExchange} → ${opp.sellExchange}</td>
        <td class="text-success">${opp.finalProfit.toFixed(2)}%</td>
        <td>
          <div class="progress" style="height: 6px;">
            <div class="progress-bar bg-success" role="progressbar" 
                 style="width: ${opp.confidence * 100}%" 
                 aria-valuenow="${opp.confidence * 100}" 
                 aria-valuemin="0" aria-valuemax="100"></div>
          </div>
          <small>${(opp.confidence * 100).toFixed(1)}%</small>
        </td>
        <td>${opp.tradeAmount.toFixed(2)} USDT</td>
        <td>${new Date(opp.timestamp).toLocaleTimeString()}</td>
      </tr>
    `,
      )
      .join("")
  }

  async loadBalances() {
    try {
      console.log("💰 Cargando balances...")
      const balances = await this.apiCall("/api/balances")
      this.updateBalances(balances)
    } catch (error) {
      console.error("❌ Error cargando balances:", error)
    }
  }

  updateBalances(balances) {
    this.updateExchangeBalances("binance-balances", balances.BINANCE || {})
    this.updateExchangeBalances("kucoin-balances", balances.KUCOIN || {})
  }

  updateExchangeBalances(tableId, balances) {
    const tbody = document.getElementById(tableId)
    if (!tbody) return

    const balanceEntries = Object.entries(balances).filter(([_, balance]) => balance.total > 0)

    if (balanceEntries.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center py-4">
            No hay balances disponibles
          </td>
        </tr>
      `
      return
    }

    tbody.innerHTML = balanceEntries
      .map(
        ([asset, balance]) => `
      <tr>
        <td>${asset}</td>
        <td>${balance.free.toFixed(6)}</td>
        <td>${balance.locked.toFixed(6)}</td>
        <td>${balance.total.toFixed(6)}</td>
      </tr>
    `,
      )
      .join("")
  }

  showNotification(message, type = "info") {
    console.log(`📢 Notificación [${type}]: ${message}`)

    // Create notification element
    const notification = document.createElement("div")
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`
    notification.style.cssText = "top: 20px; right: 20px; z-index: 9999; min-width: 300px;"
    notification.innerHTML = `
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
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 DOM cargado, inicializando dashboard...")
  try {
    new ArbitrageBotDashboard()
  } catch (error) {
    console.error("❌ Error inicializando dashboard:", error)
  }
})

// Fallback para navegadores que no soporten DOMContentLoaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Fallback: DOM cargado")
    new ArbitrageBotDashboard()
  })
} else {
  console.log("🚀 DOM ya estaba cargado")
  new ArbitrageBotDashboard()
}
const express = require('express');
const router = express.Router();
const config = require('../config');

router.get('/config', (req, res) => {
  res.json(config);
});

module.exports = router;