import React, { useEffect, useState } from "react";

export default function FeesPanel() {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/fees")
      .then(res => res.json())
      .then(data => {
        setFees(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="panel">
      <h2>💸 Fees y Mínimos</h2>
      {loading ? (
        <p>Cargando...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Exchange</th>
              <th>Token</th>
              <th>Comisión retiro</th>
              <th>Mín. retiro</th>
              <th>Mín. depósito</th> {/* 👈 NUEVA COLUMNA */}
              <th>Red</th>
            </tr>
          </thead>
          <tbody>
            {fees.map((fee, idx) => (
              <tr key={fee.exchange + fee.token + idx}>
                <td>{fee.exchange}</td>
                <td>{fee.token}</td>
                <td>{fee.withdraw_fee}</td>
                <td>{fee.withdraw_min}</td>
                <td>{fee.deposit_min}</td>   {/* 👈 NUEVO DATO */}
                <td>{fee.network}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}