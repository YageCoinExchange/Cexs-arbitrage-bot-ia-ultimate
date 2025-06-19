import React, { useState } from "react";

export default function EditTokenDialog({ pair, onEdit }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({ ...pair });

  const handleChange = (field, value) => {
    setValues({ ...values, [field]: value });
  };

  const handleSave = () => {
    onEdit(values);
    setOpen(false);
  };

  return (
    <>
      <button onClick={() => setOpen(true)}>Editar</button>
      {open && (
        <div className="modal">
          <h4>Editar {pair.pair}</h4>
          <label>
            Spread Min:
            <input
              type="number"
              value={values.min_spread}
              min="0"
              step="0.0001"
              onChange={e => handleChange("min_spread", Number(e.target.value))}
            />
          </label>
          <label>
            Slippage Máx:
            <input
              type="number"
              value={values.max_slippage}
              min="0"
              step="0.0001"
              onChange={e => handleChange("max_slippage", Number(e.target.value))}
            />
          </label>
          <label>
            Fee Trading:
            <input
              type="number"
              value={values.trading_fee}
              min="0"
              step="0.0001"
              onChange={e => handleChange("trading_fee", Number(e.target.value))}
            />
          </label>
          {/* Puedes agregar más campos como min_trade, retiros, etc */}
          <button onClick={handleSave}>Guardar</button>
          <button onClick={() => setOpen(false)}>Cancelar</button>
        </div>
      )}
    </>
  );
}