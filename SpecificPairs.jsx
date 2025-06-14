"use client"

import React from "react"

const SpecificPairs = ({ specificPairs, botStatus, onExecuteArbitrage }) => {
  const [selectedPair, setSelectedPair] = React.useState(null)
  const [showModal, setShowModal] = React.useState(false)
  const [amount, setAmount] = React.useState(100)

  const handleExecuteClick = (pair) => {
    setSelectedPair(pair)
    setShowModal(true)
  }

  const handleExecuteArbitrage = () => {
    if (selectedPair) {
      const pairData = specificPairs[selectedPair]
      onExecuteArbitrage(selectedPair, pairData.bestBuy.exchange, pairData.bestSell.exchange, amount)
      setShowModal(false)
    }
  }

  const getExchangeColor = (exchange) => {
    const colors = {
      Binance: "warning",
      Coinbase: "primary",
      Kraken: "info",
      Kucoin: "success",
    }
    return colors[exchange] || "secondary"
  }

  return (
    <>
      <div className="card h-100">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">🎯 Pares Específicos</h5>
          <span className="badge bg-primary">Tiempo Real</span>
        </div>
        <div className="card-body">
          {Object.entries(specificPairs).map(([pair, data]) => (
            <div key={pair} className={`pair-card ${data.isOpportunity ? "opportunity" : "no-opportunity"}`}>
              <div className="pair-header">
                <div className="pair-name">
                  <span className={`opportunity-indicator ${data.isOpportunity ? "yes" : "no"}`}></span>
                  {pair}
                </div>
                <div className={`profit-percentage ${data.profitPercentage >= 0.3 ? "positive" : "negative"}`}>
                  {data.profitPercentage.toFixed(2)}%
                </div>
              </div>

              <div className="exchange-prices">
                {Object.entries(data.exchanges).map(([exchange, exchangeData]) => (
                  <div
                    key={exchange}
                    className={`exchange-price ${
                      exchange === data.bestBuy.exchange
                        ? "best-buy"
                        : exchange === data.bestSell.exchange
                          ? "best-sell"
                          : ""
                    }`}
                  >
                    <div className="exchange-name">
                      <span className={`badge bg-${getExchangeColor(exchange)} me-2`}>{exchange}</span>
                      {exchange === data.bestBuy.exchange && <small>(Mejor compra)</small>}
                      {exchange === data.bestSell.exchange && <small>(Mejor venta)</small>}
                    </div>
                    <div className="exchange-price-value">${exchangeData.price.toFixed(4)}</div>
                  </div>
                ))}
              </div>

              <div className="action-buttons">
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => handleExecuteClick(pair)}
                  disabled={!botStatus.isRunning || !data.isOpportunity}
                >
                  <i className="bi bi-lightning-charge-fill me-1"></i>
                  Ejecutar Arbitraje
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de confirmación */}
      {showModal && (
        <div className="modal show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirmar Arbitraje</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <p>
                  Estás a punto de ejecutar un arbitraje para el par <strong>{selectedPair}</strong>.
                </p>
                <p>
                  <strong>Compra:</strong> {specificPairs[selectedPair]?.bestBuy.exchange} ($
                  {specificPairs[selectedPair]?.bestBuy.price.toFixed(4)})<br />
                  <strong>Venta:</strong> {specificPairs[selectedPair]?.bestSell.exchange} ($
                  {specificPairs[selectedPair]?.bestSell.price.toFixed(4)})<br />
                  <strong>Ganancia estimada:</strong> {specificPairs[selectedPair]?.profitPercentage.toFixed(2)}%
                </p>
                <div className="mb-3">
                  <label className="form-label">Cantidad a invertir (USDC)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="10"
                  />
                </div>
                <div className="alert alert-warning">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {botStatus.mode === "simulation"
                    ? "Esto es una simulación. No se ejecutarán operaciones reales."
                    : "¡ATENCIÓN! Estás en modo PRODUCCIÓN. Se ejecutarán operaciones reales."}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className={`btn ${botStatus.mode === "simulation" ? "btn-primary" : "btn-danger"}`}
                  onClick={handleExecuteArbitrage}
                >
                  {botStatus.mode === "simulation" ? "Simular Arbitraje" : "Ejecutar Arbitraje Real"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
