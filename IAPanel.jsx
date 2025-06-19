import React, { useEffect, useState } from "react";

const API_BASE = "http://localhost:8888/api";

export default function IAPanel() {
  const [config, setConfig] = useState(null);
  const [editConfig, setEditConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Cargar config inicial
  useEffect(() => {
    fetch(`${API_BASE}/config`)
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        setEditConfig(JSON.parse(JSON.stringify(data))); // Deep clone para edición
      })
      .catch(() => setEditConfig(null));
  }, []);

  if (!editConfig) return <div className="dashboard-card">Cargando...</div>;

  // Handlers de cambio
  const handleStrategyChange = (strategy, field, value) => {
    setEditConfig(prev => ({
      ...prev,
      STRATEGIES: {
        ...prev.STRATEGIES,
        [strategy]: {
          ...prev.STRATEGIES[strategy],
          [field]: value
        }
      }
    }));
  };

  const handleIATradingChange = (field, value) => {
    setEditConfig(prev => ({
      ...prev,
      AI_TRADING: { ...prev.AI_TRADING, [field]: value }
    }));
  };

  // Guardar cambios al backend
  const handleSave = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch(`${API_BASE}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editConfig),
      });
      if (res.ok) {
        setConfig(JSON.parse(JSON.stringify(editConfig)));
        setSaveMsg("✅ Cambios guardados correctamente.");
      } else {
        setSaveMsg("❌ Error al guardar. Revisa la consola del servidor.");
      }
    } catch (e) {
      setSaveMsg("❌ Error de red.");
    } finally {
      setSaving(false);
    }
  };

  const strategies = editConfig.STRATEGIES || {};
  const ai = editConfig.AI_TRADING || {};

  return (
    <div className="dashboard-card">
      <div className="card-header">
        <span className="emoji">🧠</span> Panel de IA & Estrategia (Editable)
      </div>
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSave();
        }}
      >
        <div style={{ marginBottom: 15 }}>
          <b>Estrategias configuradas:</b>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {Object.entries(strategies).map(([key, strat]) => (
              <li key={key} style={{ marginBottom: 12, background: "#181c27", borderRadius: 8, padding: 10 }}>
                <b>{strat.name}</b>
                <div>
                  <label>
                    Activada:&nbsp;
                    <input
                      type="checkbox"
                      checked={!!strat.enabled}
                      onChange={e =>
                        handleStrategyChange(key, "enabled", e.target.checked)
                      }
                    />
                  </label>
                </div>
                {strat.minProfitPercentage !== undefined && (
                  <div>
                    <label>
                      Spread mínimo (%):&nbsp;
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        style={{ width: 80 }}
                        value={strat.minProfitPercentage}
                        onChange={e =>
                          handleStrategyChange(
                            key,
                            "minProfitPercentage",
                            parseFloat(e.target.value)
                          )
                        }
                      />
                    </label>
                  </div>
                )}
                {strat.maxInvestmentPercentage !== undefined && (
                  <div>
                    <label>
                      Inversión máxima (%):&nbsp;
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        style={{ width: 80 }}
                        value={strat.maxInvestmentPercentage}
                        onChange={e =>
                          handleStrategyChange(
                            key,
                            "maxInvestmentPercentage",
                            parseFloat(e.target.value)
                          )
                        }
                      />
                    </label>
                  </div>
                )}
                {strat.timeoutMs !== undefined && (
                  <div>
                    <label>
                      Timeout (segundos):&nbsp;
                      <input
                        type="number"
                        step="1"
                        min="0"
                        style={{ width: 80 }}
                        value={strat.timeoutMs / 1000}
                        onChange={e =>
                          handleStrategyChange(
                            key,
                            "timeoutMs",
                            parseInt(e.target.value, 10) * 1000
                          )
                        }
                      />
                    </label>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div style={{ marginBottom: 15 }}>
          <b>IA Trading:</b>
          <div>
            <label>
              Activado:&nbsp;
              <input
                type="checkbox"
                checked={!!ai.ENABLED}
                onChange={e =>
                  handleIATradingChange("ENABLED", e.target.checked)
                }
              />
            </label>
          </div>
          <div>
            <label>
              Prediction Horizon (ms):&nbsp;
              <input
                type="number"
                min="0"
                step="1"
                style={{ width: 100 }}
                value={ai.PREDICTION_HORIZON || 0}
                onChange={e =>
                  handleIATradingChange(
                    "PREDICTION_HORIZON",
                    parseInt(e.target.value, 10)
                  )
                }
              />
            </label>
          </div>
        </div>
        <button
          type="submit"
          className="btn btn-success"
          disabled={saving}
          style={{ fontWeight: "bold", fontSize: 16 }}
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
        {saveMsg && (
          <div style={{ marginTop: 14, fontWeight: "bold", color: saveMsg.startsWith("✅") ? "#0f0" : "#f44" }}>
            {saveMsg}
          </div>
        )}
      </form>
    </div>
  );
}