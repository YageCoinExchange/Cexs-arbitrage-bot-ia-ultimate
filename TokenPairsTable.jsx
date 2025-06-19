import React, { useState } from "react";
import StatusBadge from "./StatusBadge";
import AlertBanner from "./AlertBanner";
import TokenReviewTimer from "./TokenReviewTimer";

// Cambia esto si tu API_BASE está en otro archivo/config
const API_BASE = "http://localhost:8888/api";

export default function TokenPairsTable({ pairs, onEdit }) {
  const [editing, setEditing] = useState({}); // {pair: {campo: valor}}

  // Cuando se empieza a editar una celda
  const startEdit = (pair, field, value) => {
    setEditing({
      ...editing,
      [pair]: { ...editing[pair], [field]: value }
    });
  };

  // Cuando se cambia el valor de input
  const handleEdit = (pair, field, value) => {
    setEditing({
      ...editing,
      [pair]: { ...editing[pair], [field]: value }
    });
  };

  // Guardar el cambio (frontend + backend)
  const handleSave = async (pair, field) => {
    if (editing[pair] && editing[pair][field] !== undefined) {
      const updatedPair = { ...pairs.find(p => p.pair === pair), [field]: editing[pair][field] };
      // Llama a la API para guardar el cambio (PUT)
      try {
        await fetch(`${API_BASE}/pairs/${pair}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedPair)
        });
      } catch (e) {
        // Opcional: muestra toast de error
      }
      onEdit(updatedPair); // actualiza estado en frontend
      setEditing({ ...editing, [pair]: { ...editing[pair], [field]: undefined } });
    }
  };

  // Para mostrar valor editable o fijo en cada celda
  const renderEditableCell = (p, field, min, max, step) => {
    const isEditing = editing[p.pair] && editing[p.pair][field] !== undefined;
    return (
      <td
        className={
          field === "min_spread" && p.min_spread < 0.002
            ? "warning-cell"
            : field === "max_slippage" && p.max_slippage > 0.01
            ? "warning-cell"
            : ""
        }
        onClick={() => !isEditing && startEdit(p.pair, field, p[field])}
        style={{ cursor: "pointer", minWidth: 80 }}
      >
        {isEditing ? (
          <input
            className="inline-edit"
            type="number"
            min={min}
            max={max}
            step={step}
            value={editing[p.pair][field]}
            onChange={e => handleEdit(p.pair, field, e.target.value)}
            onBlur={() => handleSave(p.pair, field)}
            onKeyDown={e => e.key === "Enter" && handleSave(p.pair, field)}
            autoFocus
            style={{ width: 60 }}
          />
        ) : (
          <>
            {p[field]}
            {field === "min_spread" && p.min_spread < 0.002 && (
              <span style={{ color: "#ff9800", marginLeft: 4 }}>⚠️ Bajo</span>
            )}
            {field === "max_slippage" && p.max_slippage > 0.01 && (
              <span style={{ color: "#ff9800", marginLeft: 4 }}>⚠️ Alto</span>
            )}
          </>
        )}
      </td>
    );
  };

  return (
    <table className="dashboard-table">
      <thead>
        <tr>
          <th>Par</th>
          <th>Red (Binance/Bybit)</th>
          <th>Fee Trading</th>
          <th>Spread Min</th>
          <th>Slippage Máx</th>
          <th>Fee Retiro</th>
          <th>Volumen Min</th>
          <th>Status</th>
          <th>Última revisión</th>
        </tr>
      </thead>
      <tbody>
        {pairs.map((p) => (
          <tr key={p.pair}
            className={
              (p.min_spread < 0.002 || p.max_slippage > 0.01) ? "warning-row" : ""
            }
          >
            <td>{p.pair}</td>
            <td>
              {p.binance.network} / {p.bybit.network}
            </td>
            <td>{p.trading_fee}</td>
            {/* Spread Min EDITABLE */}
            {renderEditableCell(p, "min_spread", 0, 1, 0.0001)}
            {/* Slippage Máx EDITABLE */}
            {renderEditableCell(p, "max_slippage", 0, 1, 0.0001)}
            <td>
              {p.binance.withdrawal_fee} / {p.bybit.withdrawal_fee}
            </td>
            <td>{p.min_trade}</td>
            <td>
              <StatusBadge active={p.active} />
            </td>
            <td>
              <TokenReviewTimer lastReview={p.last_review} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}