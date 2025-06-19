import React, { useState } from "react";
import "./../index.css"; // Asegúrate de importar los estilos

const BotControls = () => {
  const [mode, setMode] = useState("simulacion"); // "simulacion" o "produccion"
  const [botRunning, setBotRunning] = useState(false);

  return (
    <div style={{ display: "flex", gap: "12px" }}>
      <button
        className={`btn btn-primary ${mode === "simulacion" ? "btn-active" : ""}`}
        onClick={() => setMode("simulacion")}
      >
        Cambiar a Simulación
      </button>
      <button
        className={`btn btn-primary ${mode === "produccion" ? "btn-active" : ""}`}
        onClick={() => setMode("produccion")}
      >
        Cambiar a Producción
      </button>
      <button
        className={`btn ${botRunning ? "btn-active btn-success" : "btn-success"}`}
        onClick={() => setBotRunning((prev) => !prev)}
      >
        {botRunning ? "Bot en marcha" : "Iniciar Bot"}
      </button>
    </div>
  );
};

export default BotControls;