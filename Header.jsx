const Header = ({ botStatus }) => {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark mb-4">
      <div className="container-fluid">
        <a className="navbar-brand" href="#">
          <i className="bi bi-currency-exchange me-2"></i>
          TageCoin Exchange CEX
        </a>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <a className="nav-link active" href="#">
                Dashboard
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="#">
                Configuración
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="#">
                Historial
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="#">
                Ayuda
              </a>
            </li>
          </ul>
          <div className="d-flex align-items-center">
            <span className={`badge me-3 ${botStatus.isRunning ? "bg-success" : "bg-danger"}`}>
              {botStatus.isRunning ? "Activo" : "Inactivo"}
            </span>
            <span className={`badge me-3 ${botStatus.mode === "simulation" ? "bg-info" : "bg-danger"}`}>
              {botStatus.mode === "simulation" ? "Simulación" : "Producción"}
            </span>
            {/* NUEVO: Badge para precios reales */}
            <span className={`badge me-3 ${botStatus.usingRealPrices ? "bg-success" : "bg-secondary"}`}>
              Precios: {botStatus.usingRealPrices ? "Reales" : "Simulados"}
            </span>
            <div className="dropdown">
              <button className="btn btn-dark position-relative" type="button" data-bs-toggle="dropdown">
                <i className="bi bi-bell"></i>
                <span className="notification-badge">3</span>
              </button>
              <ul className="dropdown-menu dropdown-menu-end notification-dropdown">
                <li className="notification-item">
                  <div className="notification-icon notification-success">
                    <i className="bi bi-check-circle"></i>
                  </div>
                  <div>
                    <div className="notification-time">Hace 5 minutos</div>
                    <div className="notification-message">Operación exitosa: USDC/LTC</div>
                  </div>
                </li>
                <li className="notification-item">
                  <div className="notification-icon notification-info">
                    <i className="bi bi-info-circle"></i>
                  </div>
                  <div>
                    <div className="notification-time">Hace 15 minutos</div>
                    <div className="notification-message">Nueva oportunidad detectada</div>
                  </div>
                </li>
                <li className="notification-item">
                  <div className="notification-icon notification-warning">
                    <i className="bi bi-exclamation-triangle"></i>
                  </div>
                  <div>
                    <div className="notification-time">Hace 30 minutos</div>
                    <div className="notification-message">Alta volatilidad detectada</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Header
