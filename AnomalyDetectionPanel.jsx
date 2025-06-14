import React, { useState, useEffect } from "react";

function AnomalyDetectionPanel() {
  const [anomalies, setAnomalies] = useState([]);

  useEffect(() => {
    fetch("/api/anomalies")
      .then(res => res.json())
      .then(data => setAnomalies(data.anomalies || []))
      .catch(() => setAnomalies([]));
  }, []);

  return (
    <div id="anomalies" className="panel">
      <h3>Anomalías de Mercado</h3>
      <ul>
        {anomalies.length === 0 ? (
          <li>No se detectaron anomalías.</li>
        ) : (
          anomalies.map((a, i) => (
            <li key={i}>
              {a.type}: {a.description} ({a.timestamp})
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export default AnomalyDetectionPanel;