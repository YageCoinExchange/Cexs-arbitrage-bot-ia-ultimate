"use client"

import React from "react"

const Controls = ({
  botStatus,
  onStartBot,
  onStopBot,
  onChangeStrategy,
  onUpdateRiskSettings,
  onToggleMode,
  onToggleRealPrices,
}) => {
  const [loading, setLoading] = React.useState(false)

  const handleStartBot = async () => {
    setLoading(true)
    await onStartBot()
    setLoading(false)
  }

  const handleStopBot = async () => {
    setLoading(true)
    await onStopBot()
    setLoading(false)
  }

  const handleModeToggle = (e) => {
    const mode = e.target.checked ? "production" : "simulation"
    onToggleMode(mode)
  }

  const handleRealPricesToggle = (e) => {
    onToggleRealPrices(e.target.checked)
  }

  return (
    <div className="card h-100">
      <div className="card-header">
        <h5 className="mb-0">Control del Bot</h5>
      </div>
      <div className="card-body">
        <div className="mode-switch mb-4">
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="modeSwitch"
              checked={botStatus.mode === "production"}
              onChange={handleModeToggle}
            />
            <label className="form-check-label" htmlFor="modeSwitch">
              <span className={botStatus.mode === "simulation" ? "simulation-mode" : "production-mode"}>
                Modo: {botStatus.mode === "simulation" ? "Simulación" : "Producción"}
              </span>
            </label>
          </div>
        </div>

        {/* NUEVO: Toggle para precios reales */}
        <div className="mode-switch mb-4">
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="realPricesSwitch"
              checked={botStatus.usingRealPrices}
              onChange={handleRealPricesToggle}
            />
            <label className="form-check-label" htmlFor="realPricesSwitch">
              <span className={botStatus.usingRealPrices ? "text-success" : "text-secondary"}>
                Precios: {botStatus.usingRealPrices ? "Reales" : "Simulados"}
              </span>
            </label>
          </div>
        </div>

        <div className="d-grid gap-2 mb-4">
          {!botStatus.isRunning ? (
            <button className="btn btn-success" onClick={handleStartBot} disabled={loading}>
              {loading ? (
                <>
                  <span className="loading-spinner me-2"></span>
                  Iniciando...
                </>
              ) : (
                <>
                  <i className="bi bi-play-fill me-2"></i>
                  Iniciar Bot
                </>
              )}
            </button>
          ) : (
            <button className="btn btn-danger" onClick={handleStopBot} disabled={loading}>
              {loading ? (
                <>
                  <span className="loading-spinner me-2"></span>
                  Deteniendo...
                </>
              ) : (
                <>
                  <i className="bi bi-stop-fill me-2"></i>
                  Detener Bot
                </>
              )}
            </button>
          )}
        </div>

        <div className="mb-3">
          <label className="form-label">Estrategia</label>
          <select
            className="form-select"
            value={botStatus.currentStrategy}
            onChange={(e) => onChangeStrategy(e.target.value)}
          >
            <option value="basic">Arbitraje Básico</option>
            <option value="triangular">Arbitraje Triangular</option>
            <option value="statistical">Arbitraje Estadístico</option>
            <option value="ml">Machine Learning</option>
            <option value="combined">Estrategia Combinada</option>
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label">Nivel de Riesgo</label>
          <select
            className="form-select"
            value={botStatus.riskLevel}
            onChange={(e) => onUpdateRiskSettings(e.target.value)}
          >
            <option value="low">Bajo</option>
            <option value="medium">Medio</option>
            <option value="high">Alto</option>
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label">Intervalo de Verificación</label>
          <div className="input-group">
            <input type="number" className="form-control" value={botStatus.checkInterval} readOnly />
            <span className="input-group-text">ms</span>
          </div>
          <div className="form-text">Tiempo entre verificaciones de oportunidades</div>
        </div>
      </div>
    </div>
  )
}

export default Controls
