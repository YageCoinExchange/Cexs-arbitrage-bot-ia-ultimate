import React, { useState, useEffect } from "react";

export default function LogsPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/logs")
      .then(res => res.json())
      .then(data => {
        setLogs(data.logs || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Error al cargar logs.");
        setLoading(false);
      });
  }, []);

  return (
    <div id="logs" className="panel">
      <h3>Logs del Sistema</h3>
      {loading && <div>Cargando logs...</div>}
      {error && <div style={{ color: "red" }}>{error}</div>}
      {!loading && !error && logs.length === 0 && (
        <div>No hay logs para mostrar.</div>
      )}
      {!loading && !error && logs.length > 0 && (
        <pre style={{ background: "#222", color: "#eee", padding: "1em", borderRadius: "5px", maxHeight: 400, overflow: "auto" }}>
          {logs.map((line, i) => <div key={i}>{line}</div>)}
        </pre>
      )}
    </div>
  );
}