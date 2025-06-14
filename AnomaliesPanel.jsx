import React, { useState, useEffect } from "react";

function AnomalyDetectionPanel() {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/anomalias")
      .then(res => res.json())
      .then(data => {
        setAnomalies(data.anomalias || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div id="anomalies" className="panel">
      <h3>Detección de Anomalías</h3>
      {loading ? (
        <div className="text-muted">Cargando...</div>
      ) : anomalies.length === 0 ? (
        <div className="text-muted">No se detectaron anomalías recientes.</div>
      ) : (
        <ul>
          {anomalies.map((anomaly, i) => (
            <li key={i}>
              <strong>{anomaly.type || anomaly.categoria || "Anomalía"}</strong>
              {anomaly.timestamp && (
                <> ({new Date(anomaly.timestamp).toLocaleString()})</>
              )}
              {anomaly.descripcion && (
                <>: {anomaly.descripcion}</>
              )}
              {anomaly.message && !anomaly.descripcion && (
                <>: {anomaly.message}</>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AnomalyDetectionPanel;