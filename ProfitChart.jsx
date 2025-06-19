"use client"

import { Chart } from "@/components/ui/chart"
import React from "react"

const ProfitChart = ({ profitHistory }) => {
  const chartRef = React.useRef(null)
  const [chart, setChart] = React.useState(null)
  const [range, setRange] = React.useState("24h")

  // Filtrar profitHistory según el rango seleccionado
  const getFilteredHistory = () => {
    if (!profitHistory || profitHistory.length === 0) return []
    let cutoff = 0
    const now = new Date()
    if (range === "24h") {
      cutoff = now.getTime() - 24 * 60 * 60 * 1000
    } else if (range === "7d") {
      cutoff = now.getTime() - 7 * 24 * 60 * 60 * 1000
    } else if (range === "30d") {
      cutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000
    }
    return profitHistory.filter((item) => {
      if (!item.timestamp) return false
      const ts = typeof item.timestamp === "string" ? Date.parse(item.timestamp) : item.timestamp
      return ts >= cutoff
    })
  }

  React.useEffect(() => {
    const filtered = getFilteredHistory()
    if (chartRef.current && filtered.length > 0) {
      const ctx = chartRef.current.getContext("2d")

      if (chart) {
        chart.destroy()
      }

      const labels = filtered.map((item) => {
        const date = new Date(item.timestamp)
        if (range === "24h") {
          return `${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}`
        } else {
          return `${date.getDate()}/${date.getMonth() + 1}`
        }
      })

      const data = filtered.map((item) => item.profit)

      const newChart = new Chart(ctx, {
        type: "line",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Ganancia ($)",
              data: data,
              borderColor: "#27ae60",
              backgroundColor: "rgba(39, 174, 96, 0.1)",
              borderWidth: 2,
              tension: 0.4,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              mode: "index",
              intersect: false,
            },
          },
          scales: {
            y: {
              beginAtZero: false,
              grid: {
                color: "rgba(0, 0, 0, 0.05)",
              },
            },
            x: {
              grid: {
                display: false,
              },
            },
          },
        },
      })

      setChart(newChart)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profitHistory, range])

  // Limpieza de chart al desmontar
  React.useEffect(() => {
    return () => {
      if (chart) chart.destroy()
    }
  }, [chart])

  return (
    <div className="card h-100">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Historial de Ganancias</h5>
        <div className="btn-group">
          <button
            className={`btn btn-sm btn-outline-secondary${range === "24h" ? " active" : ""}`}
            onClick={() => setRange("24h")}
          >
            24h
          </button>
          <button
            className={`btn btn-sm btn-outline-secondary${range === "7d" ? " active" : ""}`}
            onClick={() => setRange("7d")}
          >
            7d
          </button>
          <button
            className={`btn btn-sm btn-outline-secondary${range === "30d" ? " active" : ""}`}
            onClick={() => setRange("30d")}
          >
            30d
          </button>
        </div>
      </div>
      <div className="card-body">
        <div style={{ height: "300px" }}>
          <canvas ref={chartRef}></canvas>
        </div>
      </div>
    </div>
  )
}

export default ProfitChart