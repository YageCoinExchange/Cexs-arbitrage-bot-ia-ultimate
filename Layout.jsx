import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { useBot } from "../contexts/BotContext"

const SIDEBAR_WIDTH = 220
const SIDEBAR_WIDTH_COLLAPSED = 60

const Layout = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { logout, currentUser } = useAuth()
  const { botState } = useBot()
  const location = useLocation()

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo">
            <i className="bi bi-robot"></i>
            {!sidebarCollapsed && <span>CEXs Arbitrage IA</span>}
          </Link>
          <button className="sidebar-toggle" onClick={toggleSidebar}>
            <i className={`bi bi-chevron-${sidebarCollapsed ? "right" : "left"}`}></i>
          </button>
        </div>

        <ul className="nav flex-column mt-4">
          <li className="nav-item">
            <Link to="/" className={`nav-link ${location.pathname === "/" ? "active" : ""}`}>
              <i className="bi bi-speedometer2"></i>
              {!sidebarCollapsed && <span>Dashboard</span>}
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/opportunities" className={`nav-link ${location.pathname === "/opportunities" ? "active" : ""}`}>
              <i className="bi bi-graph-up-arrow"></i>
              {!sidebarCollapsed && <span>Oportunidades</span>}
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/ai-advisor" className={`nav-link ${location.pathname === "/ai-advisor" ? "active" : ""}`}>
              <i className="bi bi-robot"></i>
              {!sidebarCollapsed && <span>Asesor IA</span>}
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/reports" className={`nav-link ${location.pathname === "/reports" ? "active" : ""}`}>
              <i className="bi bi-file-earmark-bar-graph"></i>
              {!sidebarCollapsed && <span>Reportes</span>}
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/settings" className={`nav-link ${location.pathname === "/settings" ? "active" : ""}`}>
              <i className="bi bi-gear"></i>
              {!sidebarCollapsed && <span>Configuración</span>}
            </Link>
          </li>
        </ul>

        {!sidebarCollapsed && (
          <div className="sidebar-footer">
            <div className="d-flex align-items-center mb-3">
              <div className={`badge me-2 ${botState.isRunning ? "bg-success" : "bg-danger"}`}>
                {botState.isRunning ? "Activo" : "Inactivo"}
              </div>
              <small className="text-white-50">{botState.isRunning ? "Bot en ejecución" : "Bot detenido"}</small>
            </div>
            <button className="btn btn-sm btn-light w-100" onClick={logout}>
              <i className="bi bi-box-arrow-right me-2"></i>
              Cerrar Sesión
            </button>
          </div>
        )}
      </div>

      {/* Header */}
      <header className={`header ${sidebarCollapsed ? "header-expanded" : ""}`}>
        <div className="d-flex justify-content-between align-items-center w-100">
          <div>
            <h5 className="mb-0">
              {location.pathname === "/" && "Dashboard"}
              {location.pathname === "/opportunities" && "Oportunidades de Arbitraje"}
              {location.pathname === "/ai-advisor" && "Asesor de IA"}
              {location.pathname === "/reports" && "Reportes y Análisis"}
              {location.pathname === "/settings" && "Configuración"}
            </h5>
          </div>

          <div className="d-flex align-items-center">
            {botState.isRunning && (
              <div className="me-4">
                <span className="badge bg-success me-2">
                  <i className="bi bi-play-fill"></i>
                </span>
                <span>Bot Activo</span>
              </div>
            )}

            <div className="dropdown">
              <button
                className="btn btn-sm btn-outline-secondary dropdown-toggle"
                type="button"
                id="userDropdown"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i className="bi bi-person-circle me-1"></i>
                {currentUser?.username || "Usuario"}
              </button>
              <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                <li>
                  <Link className="dropdown-item" to="/settings">
                    Configuración
                  </Link>
                </li>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <button className="dropdown-item" onClick={logout}>
                    Cerrar Sesión
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className={`main-content ${sidebarCollapsed ? "main-content-expanded" : ""}`}
        style={{
          marginLeft: sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH,
          transition: "margin-left 0.2s"
        }}
      >
        {children}
      </main>
    </div>
  )
}

export default Layout