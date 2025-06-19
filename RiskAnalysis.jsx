const RiskAnalysis = ({ riskAnalysis }) => {
  const getRiskLevelClass = (value) => {
    if (value < 30) return "risk-low"
    if (value < 60) return "risk-medium"
    return "risk-high"
  }

  // AGREGADO: recomendaciones dinámicas si existen en el backend
  const recommendations =
    Array.isArray(riskAnalysis.recommendations) && riskAnalysis.recommendations.length > 0
      ? riskAnalysis.recommendations
      : [
          "Mantener exposición limitada en mercados volátiles",
          "Diversificar entre múltiples exchanges",
          "Considerar ajustar el nivel de riesgo si es superior al 60%",
        ]

  return (
    <div className="card h-100">
      <div className="card-header">
        <h5 className="mb-0">Análisis de Riesgo</h5>
      </div>
      <div className="card-body">
        <div className="mb-3">
          <div className="d-flex justify-content-between mb-1">
            <span>Volatilidad del Mercado</span>
            <span>{riskAnalysis.marketVolatility}%</span>
          </div>
          <div className="risk-meter">
            <div
              className={`risk-level ${getRiskLevelClass(riskAnalysis.marketVolatility)}`}
              style={{ width: `${riskAnalysis.marketVolatility}%` }}
            ></div>
          </div>
        </div>

        <div className="mb-3">
          <div className="d-flex justify-content-between mb-1">
            <span>Riesgo de Exchange</span>
            <span>{riskAnalysis.exchangeRisk}%</span>
          </div>
          <div className="risk-meter">
            <div
              className={`risk-level ${getRiskLevelClass(riskAnalysis.exchangeRisk)}`}
              style={{ width: `${riskAnalysis.exchangeRisk}%` }}
            ></div>
          </div>
        </div>

        <div className="mb-3">
          <div className="d-flex justify-content-between mb-1">
            <span>Riesgo de Liquidez</span>
            <span>{riskAnalysis.liquidityRisk}%</span>
          </div>
          <div className="risk-meter">
            <div
              className={`risk-level ${getRiskLevelClass(riskAnalysis.liquidityRisk)}`}
              style={{ width: `${riskAnalysis.liquidityRisk}%` }}
            ></div>
          </div>
        </div>

        <div className="mb-3">
          <div className="d-flex justify-content-between mb-1">
            <span className="fw-bold">Riesgo General</span>
            <span className="fw-bold">{riskAnalysis.overallRisk}%</span>
          </div>
          <div className="risk-meter">
            <div
              className={`risk-level ${getRiskLevelClass(riskAnalysis.overallRisk)}`}
              style={{ width: `${riskAnalysis.overallRisk}%` }}
            ></div>
          </div>
        </div>

        <div className="mt-4">
          <h6>Recomendaciones</h6>
          <ul className="small">
            {recommendations.map((rec, idx) =>
              typeof rec === "string" ? (
                <li key={idx}>{rec}</li>
              ) : (
                <li key={idx}>
                  {rec.message || rec.text || JSON.stringify(rec)}
                  {rec.priority && (
                    <span className={`ms-2 badge bg-${rec.priority === "HIGH" ? "danger" : rec.priority === "MEDIUM" ? "warning" : "secondary"}`}>
                      {rec.priority}
                    </span>
                  )}
                </li>
              )
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default RiskAnalysis