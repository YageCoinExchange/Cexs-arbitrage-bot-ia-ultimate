import React from "react";
import { Link } from "react-router-dom";

const Sidebar = () => (
  <div className="sidebar">
    <ul>
      <li><Link to="/dashboard">Inicio</Link></li>
      <li><Link to="/general-config">Configuración General</Link></li>
      <li><Link to="/exchanges">Exchanges</Link></li>
      <li><Link to="/strategies">Estrategias de Trading</Link></li>
      <li><Link to="/risk">Gestión de Riesgos</Link></li>
      <li><Link to="/portfolio">Portfolio y Balances</Link></li>
      <li><Link to="/alerts">Alertas y Notificaciones</Link></li>
      <li><Link to="/ai">Inteligencia Artificial</Link></li>
      <li><Link to="/backtesting">Backtesting</Link></li>
      <li><Link to="/mobile-api">API Móvil</Link></li>
      <li><Link to="/logs">Logs y Monitoreo</Link></li>
      <li><Link to="/security">Seguridad</Link></li>
      <li><Link to="/troubleshooting">Troubleshooting</Link></li>
    </ul>
  </div>
);

export default Sidebar;