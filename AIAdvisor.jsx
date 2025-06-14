"use client"

import { useState, useEffect } from "react"
import { useBot } from "../contexts/BotContext"

const AIAdvisor = () => {
  const { getAISuggestions, loading: botLoading } = useBot()
  const [suggestions, setSuggestions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchSuggestions()
  }, [])

  const fetchSuggestions = async () => {
    try {
      setLoading(true)
      const data = await getAISuggestions()
      setSuggestions(data)
      setError(null)
    } catch (error) {
      console.error("Error fetching AI suggestions:", error)
      setError("Error obteniendo sugerencias de IA")
    } finally {
      setLoading(false)
    }
  }

  if (loading || botLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "80vh" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    )
  }

  return (
    <div className="container-fluid p-0">
      <div className="row mb-4">
        <div className="col-12">
          <div className="dashboard-card">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h4 className="mb-0">
                  <span className="ai-badge me-2">
                    <i className="bi bi-robot"></i>
                    IA
                  </span>
                  Asesor de Trading Inteligente
                </h4>
                <p className="text-muted mb-0">Análisis y recomendaciones basadas en inteligencia artificial</p>
              </div>

              <div>
                <button className="btn btn-primary" onClick={fetchSuggestions}>
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  Actualizar Análisis
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recomendaciones Generales */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="dashboard-card">
            <h5 className="card-header">Recomendaciones Generales</h5>

            {suggestions?.generalRecommendations?.length > 0 ? (
              <div className="mt-3">
                {suggestions.generalRecommendations.map((recommendation, index) => (
                  <div key={index} className={`ai-recommendation ${recommendation.importance.toLowerCase()}`}>
                    <div className="d-flex align-items-center mb-2">
                      <span
                        className={`badge bg-${recommendation.importance === "HIGH" ? "danger" : recommendation.importance === "MEDIUM" ? "warning" : "info"} me-2`}
                      >
                        {recommendation.importance === "HIGH"
                          ? "Alta Prioridad"
                          : recommendation.importance === "MEDIUM"
                            ? "Media Prioridad"
                            : "Baja Prioridad"}
                      </span>
                      <strong>{recommendation.type.replace("_", " ")}</strong>
                    </div>
                    <p className="mb-0">{recommendation.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <i className="bi bi-emoji-smile fs-4 text-muted"></i>
                <p className="mt-2 mb-0">No hay recomendaciones generales en este momento</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Oportunidades Analizadas */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="dashboard-card">
            <h5 className="card-header">Oportunidades Analizadas por IA</h5>

            {suggestions?.opportunities?.length > 0 ? (
              <div className="table-responsive">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Par</th>
                      <th>Exchanges</th>
                      <th>Profit</th>
                      <th>Probabilidad de Éxito</th>
                      <th>Tamaño Óptimo</th>
                      <th>Recomendación</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suggestions.opportunities.map((opportunity, index) => (
                      <tr key={index}>
                        <td>{opportunity.pair}</td>
                        <td>
                          {opportunity.buyExchange} → {opportunity.sellExchange}
                        </td>
                        <td className="text-success">{opportunity.finalProfit.toFixed(2)}%</td>
                        <td>
                          <div className="progress" style={{ height: "6px" }}>
                            <div
                              className={`progress-bar ${opportunity.aiPrediction.successProbability > 0.7 ? "bg-success" : opportunity.aiPrediction.successProbability > 0.4 ? "bg-warning" : "bg-danger"}`}
                              role="progressbar"
                              style={{ width: `${opportunity.aiPrediction.successProbability * 100}%` }}
                              aria-valuenow={opportunity.aiPrediction.successProbability * 100}
                              aria-valuemin="0"
                              aria-valuemax="100"
                            ></div>
                          </div>
                          <small>
                            {(opportunity.aiPrediction.successProbability * 100).toFixed(1)}% (
                            {opportunity.aiPrediction.confidence})
                          </small>
                        </td>
                        <td>{opportunity.aiPrediction.optimalSize} USDT</td>
                        <td>
                          <span
                            className={`badge ${opportunity.aiPrediction.recommendedTiming === "EXECUTE_NOW" ? "badge-success" : opportunity.aiPrediction.recommendedTiming === "WAIT" ? "badge-warning" : "badge-info"}`}
                          >
                            {opportunity.aiPrediction.recommendedTiming === "EXECUTE_NOW"
                              ? "Ejecutar Ahora"
                              : opportunity.aiPrediction.recommendedTiming === "WAIT"
                                ? "Esperar"
                                : "Neutral"}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-sm btn-outline-primary">
                            <i className="bi bi-info-circle me-1"></i>
                            Detalles
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-4">
                <i className="bi bi-search fs-4 text-muted"></i>
                <p className="mt-2 mb-0">No hay oportunidades analizadas en este momento</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Análisis de Mercado */}
      <div className="row">
        <div className="col-md-6">
          <div className="dashboard-card h-100">
            <h5 className="card-header">Tendencias Recientes</h5>

            {suggestions?.marketInsights?.recentTrends?.length > 0 ? (
              <div className="table-responsive">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Par</th>
                      <th>Dirección</th>
                      <th>Cambio</th>
                      <th>Fuerza</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suggestions.marketInsights.recentTrends.map((trend, index) => (
                      <tr key={index}>
                        <td>{trend.pair}</td>
                        <td>
                          {trend.direction === "UP" ? (
                            <span className="text-success">
                              <i className="bi bi-arrow-up-right me-1"></i>
                              Subida
                            </span>
                          ) : trend.direction === "DOWN" ? (
                            <span className="text-danger">
                              <i className="bi bi-arrow-down-right me-1"></i>
                              Bajada
                            </span>
                          ) : (
                            <span className="text-muted">
                              <i className="bi bi-arrow-right me-1"></i>
                              Neutral
                            </span>
                          )}
                        </td>
                        <td
                          className={
                            trend.percentChange > 0
                              ? "text-success"
                              : trend.percentChange < 0
                                ? "text-danger"
                                : "text-muted"
                          }
                        >
                          {trend.percentChange.toFixed(2)}%
                        </td>
                        <td>
                          <span className={`badge ${trend.strength === "STRONG" ? "badge-danger" : "badge-warning"}`}>
                            {trend.strength === "STRONG" ? "Fuerte" : "Moderada"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="mb-0">No hay datos de tendencias disponibles</p>
              </div>
            )}
          </div>
        </div>

        <div className="col-md-6">
          <div className="dashboard-card h-100">
            <h5 className="card-header">Mejores Horas de Trading</h5>

            {suggestions?.marketInsights?.bestTradingHours?.length > 0 ? (
              <div className="mt-3">
                <div className="list-group">
                  {suggestions.marketInsights.bestTradingHours.map((hour, index) => (
                    <div key={index} className="list-group-item list-group-item-action">
                      <div className="d-flex w-100 justify-content-between">
                        <h6 className="mb-1">
                          <i className="bi bi-clock me-2"></i>
                          {hour.formattedHour}
                        </h6>
                        <small className="text-success">{(hour.successRate * 100).toFixed(1)}% de éxito</small>
                      </div>
                      <div className="progress mt-2" style={{ height: "6px" }}>
                        <div
                          className="progress-bar bg-success"
                          role="progressbar"
                          style={{ width: `${hour.successRate * 100}%` }}
                          aria-valuenow={hour.successRate * 100}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 p-3 bg-light-info rounded">
                  <div className="d-flex align-items-center mb-2">
                    <i className="bi bi-info-circle text-info me-2"></i>
                    <strong>Volatilidad del Mercado</strong>
                  </div>
                  <p className="mb-0">
                    Volatilidad actual: <strong>{suggestions.marketInsights.marketVolatility.toFixed(2)}%</strong>
                    {suggestions.marketInsights.marketVolatility > 4 ? (
                      <span className="text-danger ms-2">(Alta - Precaución)</span>
                    ) : suggestions.marketInsights.marketVolatility > 2 ? (
                      <span className="text-warning ms-2">(Moderada)</span>
                    ) : (
                      <span className="text-success ms-2">(Baja - Favorable)</span>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="mb-0">No hay datos de horas óptimas disponibles</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIAdvisor
