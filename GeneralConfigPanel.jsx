import React, { useEffect, useState } from "react";


export default function GeneralConfigPanel() {
  const [config, setConfig] = useState({});
  const [edit, setEdit] = useState(false);

  useEffect(() => {
    api.get("/config").then(res => setConfig(res.data));
  }, []);

  function handleChange(e) {
    setConfig({ ...config, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    api.post("/config", config).then(() => setEdit(false));
  }

  return (
    <div>
      <h2>Configuración General</h2>
      {edit ? (
        <form onSubmit={handleSubmit}>
          <label>Nombre del Bot</label>
          <input name="BOT_NAME" value={config.BOT_NAME || ""} onChange={handleChange} />
          <label>Versión</label>
          <input name="VERSION" value={config.VERSION || ""} onChange={handleChange} />
          <label>Modo</label>
          <select name="ENVIRONMENT" value={config.ENVIRONMENT || ""} onChange={handleChange}>
            <option value="production">Producción</option>
            <option value="development">Desarrollo</option>
            <option value="testing">Testing</option>
          </select>
          {/* ...otros campos */}
          <button type="submit">Guardar</button>
        </form>
      ) : (
        <div>
          <p><b>Nombre del Bot:</b> {config.BOT_NAME}</p>
          <p><b>Versión:</b> {config.VERSION}</p>
          <p><b>Modo:</b> {config.ENVIRONMENT}</p>
          {/* ...otros campos */}
          <button onClick={() => setEdit(true)}>Editar</button>
        </div>
      )}
    </div>
  );
}