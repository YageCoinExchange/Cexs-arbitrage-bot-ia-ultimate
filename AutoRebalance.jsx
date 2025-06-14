"use client"

import React from "react"

const AutoRebalance = ({ botStatus, onToggleAutoRebalance, onRebalanceFunds }) => {
  const [loading, setLoading] = React.useState(false)

  const handleToggleAutoRebalance = (e) => {
    onToggleAutoRebalance(e.target.checked)
  }

  const handleManualRebalance = async () => {
    setLoading(true)
    await onRebalanceFunds()
    setLoading(false)
  }

  // Calcular porcentajes para la visualización
  const totalBalance = Object.values(botStatus.balances || {}).reduce((sum, balance) => sum + balance, 0)
  const balancePercentages = {}

  Object.entries(botStatus.balances || {}).forEach(([exchange, balance]) => {
    balancePercentages[exchange] = totalBalance > 0 ? (balance / totalBalance) * 100 : 0
  })

  return (
    <div className="card h-100">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          <i className="bi bi-arrow-repeat me-2"></i>
          Emparejamiento Automático
        </h5>
        <div className="form-check form-switch">
          <input
            className="form-check-input"
            type="checkbox"
            id="rebalanceSwitch"
            checked={botStatus.autoRebalanceEnabled}
            onChange={handleToggleAutoRebalance}
          />
          <label className="form-check-label" htmlFor="rebalanceSwitch">
            {botStatus.autoRebalanceEnabled ? "Activado" : "Desactivado"}
          </label>
        </div>
      </div>
      <div className="card-body">
        <div className="mb-3">
          <h6>Distribución Actual de Fondos</h6>
          <div className="balance-distribution">
            <div className="balance-bar" style={{ display: "flex", height: 22 }}>
              {Object.entries(balancePercentages).map(([exchange, percentage]) => (
                <div
                  key={exchange}
                  className={`balance-segment balance-${exchange.toLowerCase()}`}
                  style={{
                    width: `${percentage}%`,
                    minWidth: percentage > 0 && percentage < 8 ? "15px" : undefined,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 500,
                    fontSize: "0.95em",
                    color: "#fff",
                  }}
                  title={`${exchange}: $${(botStatus.balances[exchange] || 0).toFixed(2)} (${percentage.toFixed(1)}%)`}
                >
                  {percentage > 10 ? `${percentage.toFixed(0)}%` : ""}
                </div>
              ))}
            </div>
          </div>

          <div className="balance-legend d-flex flex-wrap mt-2">
            {Object.keys(botStatus.balances || {}).map((exchange) => (
              <div key={exchange} className="legend-item d-flex align-items-center me-3 mb-1">
                <div
                  className={`legend-color balance-${exchange.toLowerCase()}`}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 3,
                    marginRight: 6,
                  }}
                ></div>
                <span>{exchange}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <h6>Balances por Exchange</h6>
          {Object.entries(botStatus.balances || {}).map(([exchange, balance]) => (
            <div key={exchange} className="exchange-balance d-flex justify-content-between">
              <div className="exchange-balance-name">{exchange}</div>
              <div className="exchange-balance-value">${balance.toFixed(2)}</div>
            </div>
          ))}
        </div>

        <div className="d-grid">
          <button className="btn btn-primary" onClick={handleManualRebalance} disabled={loading}>
            {loading ? (
              <>
                <span className="loading-spinner me-2"></span>
                Reequilibrando...
              </>
            ) : (
              <>
                <i className="bi bi-arrow-repeat me-2"></i>
                Reequilibrar Fondos Manualmente
              </>
            )}
          </button>
        </div>

        <div className="mt-3 small text-muted">
          <p>
            <i className="bi bi-info-circle me-1"></i>
            El emparejamiento automático distribuye los fondos equitativamente entre los exchanges para maximizar las
            oportunidades de arbitraje.
          </p>
        </div>
      </div>
    </div>
  )
}

export default AutoRebalance