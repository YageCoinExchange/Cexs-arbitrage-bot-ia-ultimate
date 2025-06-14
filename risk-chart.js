// ========== GRÁFICO DE RIESGO ==========
class RiskChart {
  constructor(containerId) {
    this.container = document.getElementById(containerId)
    this.data = []
    this.init()
  }

  init() {
    if (!this.container) {
      console.warn("Contenedor de gráfico de riesgo no encontrado")
      return
    }

    this.container.innerHTML = `
      <div class="risk-chart-container">
        <h3>Análisis de Riesgo</h3>
        <div class="risk-metrics">
          <div class="metric">
            <span class="label">Exposición Total:</span>
            <span class="value" id="total-exposure">$0</span>
          </div>
          <div class="metric">
            <span class="label">Riesgo por Par:</span>
            <span class="value" id="pair-risk">Bajo</span>
          </div>
          <div class="metric">
            <span class="label">Volatilidad:</span>
            <span class="value" id="volatility">2.5%</span>
          </div>
        </div>
        <canvas id="risk-canvas" width="400" height="200"></canvas>
      </div>
    `

    this.canvas = document.getElementById("risk-canvas")
    this.ctx = this.canvas.getContext("2d")
    this.drawChart()
  }

  updateData(riskData) {
    this.data = riskData
    this.updateMetrics()
    this.drawChart()
  }

  updateMetrics() {
    const totalExposureEl = document.getElementById("total-exposure")
    const pairRiskEl = document.getElementById("pair-risk")
    const volatilityEl = document.getElementById("volatility")

    if (totalExposureEl) totalExposureEl.textContent = `$${this.data.totalExposure || 0}`
    if (pairRiskEl) pairRiskEl.textContent = this.data.riskLevel || "Bajo"
    if (volatilityEl) volatilityEl.textContent = `${this.data.volatility || 2.5}%`
  }

  drawChart() {
    if (!this.ctx) return

    // Limpiar canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Dibujar gráfico simple
    this.ctx.fillStyle = "#4CAF50"
    this.ctx.fillRect(50, 50, 100, 100)

    this.ctx.fillStyle = "#FF9800"
    this.ctx.fillRect(170, 75, 80, 75)

    this.ctx.fillStyle = "#F44336"
    this.ctx.fillRect(270, 100, 60, 50)

    // Etiquetas
    this.ctx.fillStyle = "#333"
    this.ctx.font = "12px Arial"
    this.ctx.fillText("Bajo", 75, 170)
    this.ctx.fillText("Medio", 190, 170)
    this.ctx.fillText("Alto", 285, 170)
  }
}

// Exportar para uso global
window.RiskChart = RiskChart
