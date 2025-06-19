"use client"

const AIPanel = ({ aiConfig, botStatus, onToggleAI, aiRecommendations = [] }) => {
  const handleToggleAI = (e) => {
    onToggleAI(e.target.checked)
  }

  const getDirectionIcon = (direction) => {
    return direction === "up" ? (
      <i className="bi bi-arrow-up-circle-fill text-success me-1"></i>
    ) : (
      <i className="bi bi-arrow-down-circle-fill text-danger me-1"></i>
    )
  }

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return "success"
    if (confidence >= 0.6) return "warning"
    return "danger"
  }

  return (
    <div className="card h-100">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          <i className="bi bi-robot me-2"></i>
          Inteligencia Artificial
        </h5>
        <div className="form-check form-switch">
          <input
            className="form-check-input"
            type="checkbox"
            id="aiSwitch"
            checked={aiConfig.enabled}
            onChange={handleToggleAI}
          />
          <label className="form-check-label" htmlFor="aiSwitch">
            {aiConfig.enabled ? "Activado" : "Desactivado"}
          </label>
        </div>
      </div>
      <div className="card-body">
        {!aiConfig.enabled ? (
          <div className="text-center py-4">
            <i className="bi bi-robot text-muted" style={{ fontSize: "3rem" }}></i>
            <p className="mt-3">La IA está desactivada. Actívala para obtener predicciones y recomendaciones.</p>
          </div>
        ) : (
          <>
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span>
                  Modelo: <strong>{aiConfig.model}</strong>
                </span>
                <span className="badge bg-info">Confianza: {(aiConfig.confidence * 100).toFixed(0)}%</span>
              </div>

              <div className="mb-4">
                <small className="text-muted d-block mb-1">
                  Último entrenamiento: {new Date(aiConfig.lastTraining).toLocaleString()}
                </small>
                <small className="text-muted d-block">
                  Próximo entrenamiento: {new Date(aiConfig.nextTraining).toLocaleString()}
                </small>
              </div>
            </div>

            <h6 className="mb-3">Predicciones de Mercado</h6>

            {Object.entries(aiConfig.predictions).map(([pair, prediction]) => (
              <div key={pair} className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <div>
                    <strong>{pair}</strong>
                    <span className="ms-2 text-muted small">({prediction.timeframe})</span>
                  </div>
                  <div className={`ai-prediction-${prediction.direction}`}>
                    {getDirectionIcon(prediction.direction)}
                    {prediction.direction === "up" ? "Subida" : "Bajada"}
                  </div>
                </div>
                <div className="d-flex justify-content-between align-items-center small text-muted mb-1">
                  <span>Confianza</span>
                  <span>{(prediction.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="ai-confidence">
                  <div
                    className={`ai-confidence-level bg-${getConfidenceColor(prediction.confidence)}`}
                    style={{ width: `${prediction.confidence * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}

            <div className="mt-4">
              <h6 className="mb-2">Recomendaciones de IA</h6>
              <ul className="small">
                {/* AGREGADO: Mostrar recomendaciones reales si están disponibles */}
                {aiRecommendations.length > 0
                  ? aiRecommendations.map((rec, idx) => (
                      <li key={idx}>
                        {rec.texto}
                        {rec.probabilidad ? (
                          <span className="ms-2 text-muted">({rec.probabilidad}%)</span>
                        ) : null}
                      </li>
                    ))
                  : (
                    <>
                      <li>Enfocarse en el par USDC/XRP (92% confianza)</li>
                      <li>Evitar operaciones en USDC/BNB por tendencia bajista</li>
                      <li>Considerar aumentar exposición en USDC/LTC</li>
                    </>
                  )}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default AIPanel