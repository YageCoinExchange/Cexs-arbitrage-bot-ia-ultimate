const ArbitrageOpportunities = ({ opportunities }) => {
  return (
    <div className="card h-100">
      <div className="card-header">
        <h5 className="mb-0">Oportunidades de Arbitraje</h5>
      </div>
      <div className="card-body">
        {opportunities.length === 0 ? (
          <p className="text-center text-muted">No hay oportunidades disponibles</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Par</th>
                  <th>Exchanges</th>
                  <th>Ganancia</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((opportunity, index) => (
                  <tr key={index} className={opportunity.isOpportunity ? "table-success" : ""}>
                    <td>{opportunity.pair}</td>
                    <td>
                      {opportunity.exchanges.map((exchange, i) => (
                        <span key={i} className={`badge exchange-badge bg-${getExchangeColor(exchange)} me-1`}>
                          {exchange}
                        </span>
                      ))}
                    </td>
                    <td className={opportunity.profitPercentage >= 0.3 ? "text-success fw-bold" : ""}>
                      {opportunity.profitPercentage.toFixed(2)}%
                    </td>
                    <td>
                      {opportunity.isOpportunity ? (
                        <span className="badge bg-success">Viable</span>
                      ) : (
                        <span className="badge bg-secondary">No viable</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function getExchangeColor(exchange) {
  // AGREGADO: Bybit y lowercase fallback
  const colors = {
    Binance: "warning",
    Bybit: "danger",
    Coinbase: "primary",
    Kraken: "info",
    Kucoin: "success",
    binance: "warning",
    bybit: "danger",
    coinbase: "primary",
    kraken: "info",
    kucoin: "success",
  }

  return colors[exchange] || "secondary"
}

export default ArbitrageOpportunities