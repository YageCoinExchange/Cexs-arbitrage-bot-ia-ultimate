// ========== GESTOR DE ESTRATEGIAS ==========
class StrategiesManager {
  constructor() {
    this.currentStrategy = "BALANCED"
    this.strategies = {
      CONSERVATIVE: {
        name: "Conservadora",
        minProfit: 0.5,
        maxExposure: 50,
        riskLevel: "Bajo",
      },
      BALANCED: {
        name: "Balanceada",
        minProfit: 0.3,
        maxExposure: 100,
        riskLevel: "Medio",
      },
      AGGRESSIVE: {
        name: "Agresiva",
        minProfit: 0.2,
        maxExposure: 150,
        riskLevel: "Alto",
      },
    }
  }

  init(containerId) {
    this.container = document.getElementById(containerId)
    if (!this.container) {
      console.warn("Contenedor de estrategias no encontrado")
      return
    }

    this.render()
    this.attachEventListeners()
  }

  render() {
    this.container.innerHTML = `
      <div class="strategies-container">
        <h3>Estrategias de Trading</h3>
        <div class="current-strategy">
          <span class="label">Estrategia Actual:</span>
          <span class="value" id="current-strategy-name">${this.strategies[this.currentStrategy].name}</span>
        </div>
        <div class="strategy-selector">
          ${Object.entries(this.strategies)
            .map(
              ([key, strategy]) => `
            <div class="strategy-option ${key === this.currentStrategy ? "active" : ""}" data-strategy="${key}">
              <h4>${strategy.name}</h4>
              <p>Min. Profit: ${strategy.minProfit}%</p>
              <p>Max. Exposure: $${strategy.maxExposure}</p>
              <p>Riesgo: ${strategy.riskLevel}</p>
            </div>
          `,
            )
            .join("")}
        </div>
        <button id="apply-strategy" class="btn btn-primary">Aplicar Estrategia</button>
      </div>
    `
  }

  attachEventListeners() {
    const strategyOptions = this.container.querySelectorAll(".strategy-option")
    const applyButton = document.getElementById("apply-strategy")

    strategyOptions.forEach((option) => {
      option.addEventListener("click", () => {
        strategyOptions.forEach((opt) => opt.classList.remove("active"))
        option.classList.add("active")
        this.currentStrategy = option.dataset.strategy
        document.getElementById("current-strategy-name").textContent = this.strategies[this.currentStrategy].name
      })
    })

    if (applyButton) {
      applyButton.addEventListener("click", () => {
        this.applyStrategy()
      })
    }
  }

  async applyStrategy() {
    try {
      const token = localStorage.getItem("authToken")
      const response = await fetch("/api/change-strategy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ strategy: this.currentStrategy }),
      })

      const result = await response.json()

      if (response.ok) {
        this.showNotification("Estrategia aplicada exitosamente", "success")
      } else {
        this.showNotification(result.error || "Error aplicando estrategia", "error")
      }
    } catch (error) {
      this.showNotification("Error de conexión", "error")
    }
  }

  showNotification(message, type) {
    // Crear notificación simple
    const notification = document.createElement("div")
    notification.className = `notification ${type}`
    notification.textContent = message
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      border-radius: 4px;
      color: white;
      background: ${type === "success" ? "#4CAF50" : "#F44336"};
      z-index: 1000;
    `

    document.body.appendChild(notification)

    setTimeout(() => {
      notification.remove()
    }, 3000)
  }

  // ========== AGREGADO PARA DASHBOARD (panel dinámico con API backend) ==========
  getAvailableStrategies() {
    return Object.entries(this.strategies).map(([key, strategy]) => ({
      key,
      ...strategy,
    }))
  }

  getCurrentStrategy() {
    return this.currentStrategy
  }

  setStrategy(strategyKey) {
    if (this.strategies[strategyKey]) {
      this.currentStrategy = strategyKey
      this.render()
      this.attachEventListeners()
    }
  }
  // ========== FIN AGREGADO ==========
}

// Exportar para uso global
window.StrategiesManager = StrategiesManager