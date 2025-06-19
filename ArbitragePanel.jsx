import React, { useState, useEffect } from "react";

function ArbitragePanel() {
  const [status, setStatus] = useState("off");
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Cargar oportunidades de arbitraje
    fetch("/api/opportunities")
      .then(res => res.json())
      .then(data => setOpportunities(data.opportunities || []))
      .catch(() => setOpportunities([]));
    // Cargar estado del bot
    fetch("/api/bot/status")
      .then(res => res.json())
      .then(data => setStatus(data.status))
      .catch(() => setStatus("off"));
  }, []);

  const handleToggle = () => {
    setLoading(true);
    fetch(`/api/bot/${status === "on" ? "stop" : "start"}`, { method: "POST" })
      .then(() => setStatus(status === "on" ? "off" : "on"))
      .finally(() => setLoading(false));
  };

  return (
    <div id="arbitrage" className="panel">
      <h3>Arbitraje Automático</h3>
      <button onClick={handleToggle} disabled={loading}>
        {status === "on" ? "Detener Arbitraje" : "Iniciar Arbitraje"}
      </button>
      <ul>
        {opportunities.length === 0 ? (
          <li>No hay oportunidades disponibles.</li>
        ) : (
          opportunities.map((opp, i) => (
            <li key={i}>
              {opp.description} — Profit: {opp.profit}%
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export default ArbitragePanel;