"use client"

import { createContext, useState, useContext, useEffect } from "react"
import api from "../services/apiRoutes"

const BotContext = createContext()

export const useBot = () => useContext(BotContext)

export const BotProvider = ({ children, socket }) => {
  const [botState, setBotState] = useState({
    isRunning: false,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfit: 0,
    dailyTrades: 0,
    dailyProfit: 0,
    dailyLoss: 0,
    cycleCount: 0,
    emergencyStop: false,
    pausedDueToAnomalies: false,
    pauseReason: "",
  })

  const [exposure, setExposure] = useState({
    total: 0,
    byPair: {},
  })

  const [balances, setBalances] = useState({
    BINANCE: {},
    KUCOIN: {},
  })

  const [opportunities, setOpportunities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Cargar estado inicial
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true)

        // Obtener estado del bot
        const statusResponse = await api.get("/api/status")
        setBotState(statusResponse.data.botState)
        setExposure(statusResponse.data.exposure)

        // Obtener balances
        const balancesResponse = await api.get("/api/balances")
        setBalances(balancesResponse.data)

        // Obtener oportunidades
        const opportunitiesResponse = await api.get("/api/opportunities")
        setOpportunities(opportunitiesResponse.data)

        setError(null)
      } catch (error) {
        console.error("Error fetching initial data:", error)
        setError("Error cargando datos iniciales")
      } finally {
        setLoading(false)
      }
    }

    fetchInitialData()
  }, [])

  // Escuchar actualizaciones en tiempo real
  useEffect(() => {
    if (!socket) return

    socket.on("status_update", (data) => {
      setBotState(data.botState)
      setExposure(data.exposure)
    })

    socket.on("new_opportunity", (data) => {
      setOpportunities((prev) => [data, ...prev].slice(0, 20))
    })

    socket.on("balance_update", (data) => {
      setBalances(data)
    })

    return () => {
      socket.off("status_update")
      socket.off("new_opportunity")
      socket.off("balance_update")
    }
  }, [socket])

  // Iniciar el bot
  const startBot = async () => {
    try {
      const response = await api.post("/api/bot/start")
      if (response.data.success) {
        setBotState((prev) => ({ ...prev, isRunning: true }))
      }
      return response.data
    } catch (error) {
      console.error("Error starting bot:", error)
      return { success: false, message: error.response?.data?.message || "Error iniciando el bot" }
    }
  }

  // Detener el bot
  const stopBot = async () => {
    try {
      const response = await api.post("/api/bot/stop")
      if (response.data.success) {
        setBotState((prev) => ({ ...prev, isRunning: false }))
      }
      return response.data
    } catch (error) {
      console.error("Error stopping bot:", error)
      return { success: false, message: error.response?.data?.message || "Error deteniendo el bot" }
    }
  }

  // Ejecutar arbitraje manualmente
  const executeArbitrage = async (opportunityId) => {
    try {
      const response = await api.post("/api/bot/execute", { opportunityId })
      return response.data
    } catch (error) {
      console.error("Error executing arbitrage:", error)
      return { success: false, message: error.response?.data?.message || "Error ejecutando arbitraje" }
    }
  }

  // Actualizar configuración
  const updateSettings = async (settings) => {
    try {
      const response = await api.post("/api/bot/settings", { settings })
      return response.data
    } catch (error) {
      console.error("Error updating settings:", error)
      return { success: false, message: error.response?.data?.message || "Error actualizando configuración" }
    }
  }

  // Obtener reporte
  const getReport = async () => {
    try {
      const response = await api.get("/api/report")
      return response.data
    } catch (error) {
      console.error("Error fetching report:", error)
      throw new Error(error.response?.data?.message || "Error obteniendo reporte")
    }
  }

  // Obtener sugerencias de IA
  const getAISuggestions = async () => {
    try {
      const response = await api.get("/api/ai/suggestions")
      return response.data
    } catch (error) {
      console.error("Error fetching AI suggestions:", error)
      throw new Error(error.response?.data?.message || "Error obteniendo sugerencias de IA")
    }
  }

  const value = {
    botState,
    exposure,
    balances,
    opportunities,
    loading,
    error,
    startBot,
    stopBot,
    executeArbitrage,
    updateSettings,
    getReport,
    getAISuggestions,
    refreshOpportunities: async () => {
      try {
        const response = await api.get("/api/opportunities")
        setOpportunities(response.data)
        return { success: true }
      } catch (error) {
        console.error("Error refreshing opportunities:", error)
        return { success: false, message: error.message }
      }
    },
  }

  return <BotContext.Provider value={value}>{children}</BotContext.Provider>
}
