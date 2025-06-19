import React, { useEffect, useState } from "react";

const CommissionPanel = () => {
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/commissions")
      .then((res) => res.json())
      .then((data) => {
        setCommissions(data.commissions || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Error al cargar comisiones.");
        setLoading(false);
      });
  }, []);

  return (
    <div className="panel">
      <h2>Comisiones</h2>
      {loading && <div>Cargando comisiones...</div>}
      {error && <div style={{ color: "red" }}>{error}</div>}
      {!loading && !error && commissions.length === 0 && (
        <div>No hay datos de comisiones.</div>
      )}
      {!loading && !error && commissions.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Exchange</th>
              <th>Tipo</th>
              <th>Comisión</th>
            </tr>
          </thead>
          <tbody>
            {commissions.map((c, idx) => (
              <tr key={idx}>
                <td>{c.exchange || "N/A"}</td>
                <td>{c.type || "N/A"}</td>
                <td>{c.fee || "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CommissionPanel;