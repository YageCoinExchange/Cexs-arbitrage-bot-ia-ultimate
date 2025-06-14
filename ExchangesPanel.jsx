import React, { useState, useEffect } from "react";


export default function RiskManagerPanel() {
  const [risk, setRisk] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/risk").then(res => setRisk(res.data));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith("STOP_LOSS.")) {
      const sub = name.split(".")[1];
      setRisk((prev) => ({
        ...prev,
        STOP_LOSS: { ...prev.STOP_LOSS, [sub]: type === "checkbox" ? checked : value }
      }));
    } else if (name.startsWith("VOLATILITY_LIMITS.")) {
      const sub = name.split(".")[1];
      setRisk((prev) => ({
        ...prev,
        VOLATILITY_LIMITS: { ...prev.VOLATILITY_LIMITS, [sub]: type === "checkbox" ? checked : value }
      }));
    } else {
      setRisk((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = () => {
    setSaving(true);
    api.post("/risk", risk).then(() => setSaving(false));
  };

  if (!risk) return <div>Cargando...</div>;

  return (
    <div id="risk" className="panel">
      <h3>Gestión de Riesgo</h3>
      <label>
        Máx. pérdida diaria ($):
        <input name="MAX_DAILY_LOSS" type="number" value={risk.MAX_DAILY_LOSS} onChange={handleChange} />
      </label>
      <label>
        Máx. Drawdown (%):
        <input name="MAX_DRAWDOWN" type="number" value={risk.MAX_DRAWDOWN} step="0.01" onChange={handleChange} />
      </label>
      <label>
        Máx. exposición por par (%):
        <input name="MAX_EXPOSURE_PER_PAIR" type="number" value={risk.MAX_EXPOSURE_PER_PAIR} step="0.01" onChange={handleChange} />
      </label>
      <label>
        Máx. exposición por exchange (%):
        <input name="MAX_EXPOSURE_PER_EXCHANGE" type="number" value={risk.MAX_EXPOSURE_PER_EXCHANGE} step="0.01" onChange={handleChange} />
      </label>

      <fieldset>
        <legend>Stop Loss</legend>
        <label>
          Habilitado:
          <input type="checkbox" name="STOP_LOSS.enabled" checked={!!risk.STOP_LOSS?.enabled} onChange={handleChange} />
        </label>
        <label>
          Porcentaje stop loss:
          <input type="number" name="STOP_LOSS.percentage" step="0.01" value={risk.STOP_LOSS?.percentage || ""} onChange={handleChange} />
        </label>
        <label>
          Trailing Stop:
          <input type="checkbox" name="STOP_LOSS.trailingStop" checked={!!risk.STOP_LOSS?.trailingStop} onChange={handleChange} />
        </label>
        <label>
          Distancia trailing:
          <input type="number" name="STOP_LOSS.trailingDistance" step="0.01" value={risk.STOP_LOSS?.trailingDistance || ""} onChange={handleChange} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Límites de Volatilidad</legend>
        <label>
          Máx. volatilidad (%):
          <input type="number" name="VOLATILITY_LIMITS.maxVolatility" step="0.01" value={risk.VOLATILITY_LIMITS?.maxVolatility || ""} onChange={handleChange} />
        </label>
        <label>
          Ventana de volatilidad (h):
          <input type="number" name="VOLATILITY_LIMITS.volatilityWindow" value={risk.VOLATILITY_LIMITS?.volatilityWindow || ""} onChange={handleChange} />
        </label>
        <label>
          Pausar si volatilidad alta:
          <input type="checkbox" name="VOLATILITY_LIMITS.pauseOnHighVolatility" checked={!!risk.VOLATILITY_LIMITS?.pauseOnHighVolatility} onChange={handleChange} />
        </label>
      </fieldset>

      <label>
        Umbral de rebalanceo (%):
        <input name="REBALANCE_THRESHOLD" type="number" step="0.01" value={risk.REBALANCE_THRESHOLD} onChange={handleChange} />
      </label>
      <label>
        Rebalanceo automático:
        <input type="checkbox" name="AUTO_REBALANCE" checked={!!risk.AUTO_REBALANCE} onChange={handleChange} />
      </label>
      <label>
        Frecuencia de rebalanceo (ms):
        <input name="REBALANCE_FREQUENCY" type="number" value={risk.REBALANCE_FREQUENCY} onChange={handleChange} />
      </label>

      <button onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Actualizar"}</button>
    </div>
  );
}