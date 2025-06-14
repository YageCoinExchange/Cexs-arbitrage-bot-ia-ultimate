import React, { useEffect, useState } from "react";

const MetricsPanel = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/metrics")
      .then((res) => res.json())
      .then((data) => {
        setMetrics(data.metrics || data); // admite respuesta {metrics:...} o {...}
        setLoading(false);
      })
      .catch(() => {
        setError("Error al cargar métricas.");
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="panel">Cargando métricas...</div>;
  if (error) return <div className="panel" style={{ color: "red" }}>{error}</div>;
  if (!metrics || Object.keys(metrics).length === 0)
    return <div className="panel">No hay métricas para mostrar.</div>;

  return (
    <div className="panel">
      <h2>Métricas del Bot</h2>
      <ul>
        {Object.entries(metrics).map(([key, value]) => (
          <li key={key}>
            <strong>{key}:</strong> {value?.toString()}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MetricsPanel;