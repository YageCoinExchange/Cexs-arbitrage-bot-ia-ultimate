import React from "react";

export default function OperationHistory({ history }) {
  return (
    <div>
      <h4>Historial de operaciones</h4>
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Par</th>
            <th>Acción</th>
            <th>Resultado</th>
            <th>Motivo</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h, i) => (
            <tr key={i}>
              <td>{h.date}</td>
              <td>{h.pair}</td>
              <td>{h.action}</td>
              <td>{h.success ? "✅" : "❌"}</td>
              <td>{h.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}