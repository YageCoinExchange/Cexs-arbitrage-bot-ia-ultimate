"use client"

import React from "react"
import axios from "axios"
import Header from "./Header"
import StatusCard from "./StatusCard"
import ProfitChart from "./ProfitChart"
import Controls from "./Controls"
import SpecificPairs from "./SpecificPairs"
import AIPanel from "./AIPanel"
import BalanceChart from "./BalanceChart"
import AutoRebalance from "./AutoRebalance"
import ArbitrageOpportunities from "./ArbitrageOpportunities"
import RiskAnalysis from "./RiskAnalysis"

const App = () => {
  const [botStatus, setBotStatus] = React.useState({
    isRunning: false,
    mode: "simulation",
    totalProfit: 0,
    totalTrades: 0,
    successfulTrades: 0,
    failedTrades: 0,
    currentStrategy: "basic",
    riskLevel: "medium",
    tradingPairs: [],
    checkInterval: 5000,
    averageLatency: "45ms",
    aiEnabled: true,
    autoRebalanceEnabled: false,
    usingRealPrices: false, // Nuevo estado para precios reales
    balances: {
      Binance: 0,
      Kucoin: 0,
    },
  })

  const [profitHistory, setProfitHistory] = React.useState([])
  const [balanceHistory, setBalanceHistory] = React.useState({
    timestamps: [],
    balances: {
      Binance: [],
      Kucoin: [],
    },
  })

  const [opportunities, setOpportunities] = React.useState([])
  const [riskAnalysis, setRiskAnalysis] = React.useState({
    marketVolatility: 0,
    exchangeRisk: 0,
    liquidityRisk: 0,
    overallRisk: 0,
  })

  const [specificPairs, setSpecificPairs] = React.useState({})
  const [aiConfig, setAiConfig] = React.useState({
    enabled: true,
    model: "",
    confidence: 0,
    predictions: {},
    lastTraining: new Date(),
    nextTraining: new Date(),
  })

  // AGREGADO: Estado para recomendaciones IA y anomalías
  const [aiRecommendations, setAiRecommendations] = React.useState([])
  const [anomalies, setAnomalies] = React.useState([])

  // Cargar datos iniciales
  React.useEffect(() => {
    fetchData()

    // Actualizar datos cada 5 segundos
    const interval = setInterval(fetchData, 5000)

    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [
        statusResponse,
        profitHistoryResponse,
        balanceHistoryResponse,
        opportunitiesResponse,
        riskAnalysisResponse,
        specificPairsResponse,
        aiConfigResponse,
        aiRecommendationsResponse,
        anomaliesResponse,
      ] = await Promise.all([
        axios.get("/api/status"),
        axios.get("/api/profit-history"),
        axios.get("/api/balance-history"),
        axios.get("/api/opportunities"),
        axios.get("/api/risk-analysis"),
        axios.get("/api/specific-pairs"),
        axios.get("/api/ai-config"),
        axios.get("/api/ia/recomendaciones"),
        axios.get("/api/anomalias"),
      ])

      setBotStatus(statusResponse.data)
      setProfitHistory(profitHistoryResponse.data)
      setBalanceHistory(balanceHistoryResponse.data)
      setOpportunities(opportunitiesResponse.data)
      setRiskAnalysis(riskAnalysisResponse.data)
      setSpecificPairs(specificPairsResponse.data)
      setAiConfig(aiConfigResponse.data)
      setAiRecommendations(aiRecommendationsResponse.data.recomendaciones || [])
      setAnomalies(anomaliesResponse.data.anomalias || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    }
  }

  const handleStartBot = async () => {
    try {
      await axios.post("/api/start-bot", { mode: botStatus.mode })
      fetchData()
    } catch (error) {
      console.error("Error starting bot:", error)
    }
  }

  const handleStopBot = async () => {
    try {
      await axios.post("/api/stop-bot")
      fetchData()
    } catch (error) {
      console.error("Error stopping bot:", error)
    }
  }

  const handleChangeStrategy = async (strategy) => {
    try {
      await axios.post("/api/change-strategy", { strategy })
      fetchData()
    } catch (error) {
      console.error("Error changing strategy:", error)
    }
  }

  const handleUpdateRiskSettings = async (riskLevel) => {
    try {
      await axios.post("/api/update-risk-settings", { riskLevel })
      fetchData()
    } catch (error) {
      console.error("Error updating risk settings:", error)
    }
  }

  const handleToggleMode = async (mode) => {
    try {
      await axios.post("/api/toggle-mode", { mode })
      fetchData()
    } catch (error) {
      console.error("Error toggling mode:", error)
    }
  }

  const handleToggleAI = async (enabled) => {
    try {
      await axios.post("/api/toggle-ai", { enabled })
      fetchData()
    } catch (error) {
      console.error("Error toggling AI:", error)
    }
  }

  // NUEVO: Manejar toggle de precios reales
  const handleToggleRealPrices = async (enabled) => {
    try {
      await axios.post("/api/toggle-real-prices", { enabled })
      fetchData()
    } catch (error) {
      console.error("Error toggling real prices:", error)
    }
  }

  const handleToggleAutoRebalance = async (enabled) => {
    try {
      await axios.post("/api/toggle-auto-rebalance", { enabled })
      fetchData()
    } catch (error) {
      console.error("Error toggling auto-rebalance:", error)
    }
  }

  const handleRebalanceFunds = async () => {
    try {
      await axios.post("/api/rebalance-funds")
      fetchData()
    } catch (error) {
      console.error("Error rebalancing funds:", error)
    }
  }

  const handleExecuteArbitrage = async (pair, buyExchange, sellExchange, amount) => {
    try {
      await axios.post("/api/execute-arbitrage", {
        pair,
        buyExchange,
        sellExchange,
        amount,
      })
      fetchData()
    } catch (error) {
      console.error("Error executing arbitrage:", error)
    }
  }

  return (
    <div>
      <Header botStatus={botStatus} />

      <div className="container-fluid">
        <div className="row mb-4">
          <StatusCard
            title="Ganancia Total"
            value={`$${botStatus.totalProfit.toFixed(2)}`}
            icon="bi-graph-up-arrow"
            color="success"
          />
          <StatusCard
            title="Operaciones Totales"
            value={botStatus.totalTrades}
            icon="bi-arrow-left-right"
            color="primary"
          />
          <StatusCard
            title="Tasa de Éxito"
            value={`${
              botStatus.totalTrades > 0 ? ((botStatus.successfulTrades / botStatus.totalTrades) * 100).toFixed(1) : 0
            }%`}
            icon="bi-check-circle"
            color="info"
          />
          <StatusCard
            title="Latencia Promedio"
            value={botStatus.averageLatency}
            icon="bi-speedometer"
            color="warning"
          />
        </div>

        <div className="row mb-4">
          <div className="col-md-8">
            <ProfitChart profitHistory={profitHistory} />
          </div>
          <div className="col-md-4">
            <Controls
              botStatus={botStatus}
              onStartBot={handleStartBot}
              onStopBot={handleStopBot}
              onChangeStrategy={handleChangeStrategy}
              onUpdateRiskSettings={handleUpdateRiskSettings}
              onToggleMode={handleToggleMode}
              onToggleRealPrices={handleToggleRealPrices} // Nuevo prop
            />
          </div>
        </div>

        <div className="row mb-4">
          <div className="col-md-6">
            <SpecificPairs
              specificPairs={specificPairs}
              botStatus={botStatus}
              onExecuteArbitrage={handleExecuteArbitrage}
            />
          </div>
          <div className="col-md-6">
            <AIPanel
              aiConfig={aiConfig}
              botStatus={botStatus}
              onToggleAI={handleToggleAI}
              aiRecommendations={aiRecommendations}
            />
          </div>
        </div>

        <div className="row mb-4">
          <div className="col-md-6">
            <BalanceChart balanceHistory={balanceHistory} />
          </div>
          <div className="col-md-6">
            <AutoRebalance
              botStatus={botStatus}
              onToggleAutoRebalance={handleToggleAutoRebalance}
              onRebalanceFunds={handleRebalanceFunds}
            />
          </div>
        </div>

        <div className="row mb-4">
          <div className="col-md-8">
            <ArbitrageOpportunities opportunities={opportunities} />
          </div>
          <div className="col-md-4">
            <RiskAnalysis riskAnalysis={riskAnalysis} anomalies={anomalies} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App