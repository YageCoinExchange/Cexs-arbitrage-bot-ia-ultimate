import React, { useState, useEffect } from "react";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./dashboard-pro.css";
import OpportunitiesPanel from '../components/OpportunitiesPanel';
import IAPanel from '../components/IAPanel';
import TokenPairsTable from "../components/TokenPairsTable";
import OperationHistory from "../components/OperationHistory";
import PairsPanel from '../components/PairsPanel';

// Configura la URL de tu backend aquí:
const API_BASE = "http://localhost:8888/api"

const BOT_NAME = "YAGECOIN EXCHANGE 🤖";
const BOT_BADGE = "Arbitraje IA Ultimate";
const BOT_LOGO = "https://i.ibb.co/gZ3hKxQt/YGCT-32-X32.png";

// Emojis para cada sección:
const sectionConfig = [
  { emoji: "📈", label: "Precios Tiempo Real", icon: "bi-lightning-charge" },
  { emoji: "💰", label: "Oportunidades", icon: "bi-currency-exchange" },
  { emoji: "💳", label: "Balances", icon: "bi-wallet2" },
  { emoji: "🧠", label: "IA & Estrategia", icon: "bi-cpu" },
  { emoji: "🛡️", label: "Riesgo", icon: "bi-shield-check" },
  { emoji: "🔄", label: "Rebalanceo", icon: "bi-arrow-repeat" },
  { emoji: "📝", label: "Logs", icon: "bi-journal-text" },
  { emoji: "🌐", label: "Direcciones", icon: "bi-link-45deg" },
  { emoji: "💸", label: "Fees", icon: "bi-cash-coin" },
  { emoji: "📊", label: "Métricas", icon: "bi-bar-chart" },
  { emoji: "⚙️", label: "Pares & Control", icon: "bi-sliders" }
];

const PAIRS = [
  { symbol: "LTCUSDT", display: "LTC/USDT", icon: "https://i.postimg.cc/QtnQV83h/litecoin.jpg" },
  { symbol: "BNBUSDT", display: "BNB/USDT", icon: "https://i.postimg.cc/ZnBrdGb3/bnb.png" },
  { symbol: "XRPUSDT", display: "XRP/USDT", icon: "https://i.postimg.cc/4yDpbWy0/xrp.png" }
];

const EXCHANGES = ["Binance", "Bybit"];
const TOKENS = ["USDT", ...PAIRS.map(pair => pair.symbol.replace('USDT', ''))];

// --- Paneles ---

function PricesPanel() {
  const [prices, setPrices] = useState({});

  useEffect(() => {
    const ws = new window.WebSocket(
      `wss://stream.binance.com:9443/stream?streams=${PAIRS.map(p => p.symbol.toLowerCase() + '@ticker').join('/')}`
    );
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.data && msg.data.s && msg.data.c) {
        setPrices(prev => ({
          ...prev,
          [msg.data.s]: {
            ...(prev[msg.data.s] || {}),
            binance: msg.data.c
          }
        }));
      }
    };
    return () => ws.close();
  }, []);

  useEffect(() => {
    let ws;
    let reconnectTimeout;

    const connect = () => {
      ws = new window.WebSocket("wss://stream.bybit.com/v5/public/spot");
      ws.onopen = () => {
        ws.send(JSON.stringify({
          op: "subscribe",
          args: PAIRS.map(p => `tickers.${p.symbol}`)
        }));
      };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.topic && msg.data && msg.data.symbol && msg.data.lastPrice) {
            setPrices(prev => ({
              ...prev,
              [msg.data.symbol]: {
                ...(prev[msg.data.symbol] || {}),
                bybit: msg.data.lastPrice
              }
            }));
          }
        } catch (e) {}
      };
      ws.onerror = () => ws.close();
      ws.onclose = () => {
        reconnectTimeout = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  return (
    <div className="dashboard-card">
      <div className="card-header"><span className="emoji">📈</span>Precios y Mejor Oportunidad de Arbitraje</div>
      <div className="table-responsive">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Par</th>
              <th>Binance</th>
              <th>Bybit</th>
              <th>Mejor Spread</th>
              <th>Spread %</th>
            </tr>
          </thead>
          <tbody>
            {PAIRS.map(pair => {
              const data = prices[pair.symbol] || {};
              const bin = data.binance ? parseFloat(data.binance) : null;
              const byb = data.bybit ? parseFloat(data.bybit) : null;

              let bestDirection = "";
              let spread = null;
              let spreadPct = null;
              let colorClass = "";

              if (bin && byb) {
                const spreadBybitMinusBinance = byb - bin;
                const spreadBinanceMinusBybit = bin - byb;
                if (Math.abs(spreadBybitMinusBinance) > Math.abs(spreadBinanceMinusBybit)) {
                  spread = spreadBybitMinusBinance;
                  spreadPct = ((spreadBybitMinusBinance / bin) * 100);
                  if (spread > 0) {
                    bestDirection = "Binance → Bybit";
                    colorClass = "text-primary";
                  } else {
                    bestDirection = "Bybit → Binance";
                    colorClass = "text-success";
                  }
                } else {
                  spread = spreadBinanceMinusBybit;
                  spreadPct = ((spreadBinanceMinusBybit / byb) * 100);
                  if (spread > 0) {
                    bestDirection = "Bybit → Binance";
                    colorClass = "text-success";
                  } else {
                    bestDirection = "Binance → Bybit";
                    colorClass = "text-primary";
                  }
                }
              }

              const fmt = v => v !== null && v !== undefined && !isNaN(v)
                ? parseFloat(v).toLocaleString(undefined, {minimumFractionDigits: 4, maximumFractionDigits: 8})
                : "-";

              return (
                <tr key={pair.symbol}>
                  <td>
                    <img src={pair.icon} alt={pair.symbol} style={{ width: 22, marginRight: 8, borderRadius: 6 }} />
                    {pair.symbol} {pair.display && pair.display !== pair.symbol ? pair.display : ""}
                  </td>
                  <td>{fmt(data.binance)}</td>
                  <td>{fmt(data.bybit)}</td>
                  <td className={colorClass}>
                    {spread !== null
                      ? (<>
                          <b>
                            {bestDirection === "Binance → Bybit"
                              ? <span style={{color: "#00BFFF"}}>Binance <span style={{fontWeight: "bold"}}>→</span> Bybit</span>
                              : <span style={{color: "#28a745"}}>Bybit <span style={{fontWeight: "bold"}}>→</span> Binance</span>
                            }
                          </b>
                          <span style={{marginLeft: 8, fontWeight: "bold"}}>{fmt(spread)}</span>
                        </>)
                      : "-"}
                  </td>
                  <td className={colorClass}>
                    {spreadPct !== null ? spreadPct.toFixed(3) + " %" : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: "0.95em", marginTop: 10, color: "#888" }}>
        * El mejor spread y dirección indican dónde comprar y dónde vender para el mayor arbitraje posible en ese par.<br />
        * Flecha azul: oportunidad de Binance → Bybit. Flecha verde: oportunidad de Bybit → Binance.
      </div>
    </div>
  );
}

function BalancesPanel() {
  const [balances, setBalances] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/balances`)
      .then(res => res.json())
      .then(setBalances)
      .catch(() => setBalances(null));
  }, []);

  if (!balances) return (
    <div className="dashboard-card">
      <div className="card-header" style={{color: "#FFD700", fontWeight: "bold"}}>Balances</div>
      <div style={{color: "#fff", fontWeight: "bold"}}>Cargando...</div>
    </div>
  );

  return (
    <div className="dashboard-card">
      <div className="card-header" style={{color: "#FFD700", fontWeight: "bold"}}>
        <span className="emoji">💳</span>Balances por Exchange
      </div>
      {EXCHANGES.map(ex => (
        <div key={ex}>
          <h6 style={{color: "#FFD700", fontWeight: "bold"}}>{ex.charAt(0).toUpperCase() + ex.slice(1)}</h6>
          <div className="table-responsive">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Disponible</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {TOKENS.map(token => {
                  const bal = balances[ex] && balances[ex].find(b => b.token === token)
                    ? balances[ex].find(b => b.token === token)
                    : { token, available: 0, total: 0 };
                  return (
                    <tr key={token}>
                      <td style={{color: "#fff", fontWeight: "bold"}}>{bal.token}</td>
                      <td style={{color: "#fff", fontWeight: "bold"}}>{bal.available}</td>
                      <td style={{color: "#fff", fontWeight: "bold"}}>{bal.total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function RiskPanel() {
  return (
    <div className="dashboard-card">
      <div className="card-header"><span className="emoji">🛡️</span>Gestión de Riesgo</div>
      <div className="risk-metric">
        <span className="risk-label">Máx. exposición:</span>
        <span className="risk-value">200 USDT</span>
      </div>
      <div className="risk-metric">
        <span className="risk-label">Pérdida diaria máx.:</span>
        <span className="risk-value">12 USDT</span>
      </div>
      <div className="risk-metric">
        <span className="risk-label">Drawdown:</span>
        <span className="risk-value">6.2 USDT</span>
      </div>
    </div>
  );
}

function RebalancePanel() {
  const [lastRebalance, setLastRebalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isAutoRebalance, setIsAutoRebalance] = useState(false);
  const [rebalanceInterval, setRebalanceInterval] = useState("10 min");
  const [rebalanceAmount, setRebalanceAmount] = useState("");
  const [balances, setBalances] = useState(null);

  // Nuevo: para elegir exchanges y token
  const [fromExchange, setFromExchange] = useState(EXCHANGES[0]);
  const [toExchange, setToExchange] = useState(EXCHANGES[1]);
  const [token, setToken] = useState(TOKENS[0]);

  useEffect(() => {
    fetch("/api/rebalance/last")
      .then(res => res.json())
      .then(data => setLastRebalance(data.lastRebalance))
      .catch(() => setLastRebalance(null));

    fetch("/api/balances")
      .then(res => res.json())
      .then(setBalances)
      .catch(() => setBalances(null));
  }, []);

  const handleManualRebalance = () => {
    setLoading(true);
    setMessage("");
    fetch("/api/rebalance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(rebalanceAmount),
        fromExchange,
        toExchange,
        token
      })
    })
      .then(res => res.json())
      .then(data => {
        setMessage(data.message || "Rebalanceo ejecutado.");
        setLastRebalance(new Date().toISOString());
        // Recargar balances tras rebalanceo
        fetch("/api/balances")
          .then(res => res.json())
          .then(setBalances)
          .catch(() => {});
      })
      .catch(() => setMessage("Error al ejecutar el rebalanceo."))
      .finally(() => setLoading(false));
  };

  const toggleAutoRebalance = () => {
    const newStatus = !isAutoRebalance;
    setIsAutoRebalance(newStatus);
    setMessage(newStatus ? "Rebalanceo automático activado." : "Rebalanceo automático desactivado.");
    // Aquí podrías enviar activación al backend si corresponde
  };

  const handleIntervalChange = (e) => {
    setRebalanceInterval(e.target.value);
    setMessage(`Intervalo de rebalanceo automático: ${e.target.value}`);
    // Puedes enviar el intervalo al backend si lo necesitas
  };

  // Evitar seleccionar el mismo exchange en origen y destino
  useEffect(() => {
    if (fromExchange === toExchange) {
      const newTo = EXCHANGES.find(ex => ex !== fromExchange) || EXCHANGES[0];
      setToExchange(newTo);
    }
  }, [fromExchange]);

  return (
    <div id="rebalance" className="panel">
      <h3>Panel de Rebalanceo</h3>
      <p>Último rebalanceo: {lastRebalance ? new Date(lastRebalance).toLocaleString() : "No disponible"}</p>
      {/* Mostrar balances actuales */}
      <div style={{ marginBottom: 16 }}>
        <h4>Balances Actuales</h4>
        {balances ? (
          <div style={{ display: "flex", gap: 24 }}>
            {Object.entries(balances).map(([exchange, tokens]) => (
              <div key={exchange}>
                <b style={{ color: "#FFD700" }}>{exchange}</b>
                <table style={{ width: "100%", fontSize: "0.95em" }}>
                  <thead>
                    <tr>
                      <th style={{ color: "#FFD700" }}>Token</th>
                      <th style={{ color: "#FFD700" }}>Disponible</th>
                      <th style={{ color: "#FFD700" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokens.map(b => (
                      <tr key={b.token}>
                        <td style={{ color: "#fff" }}>{b.token}</td>
                        <td style={{ color: "#fff" }}>{b.available}</td>
                        <td style={{ color: "#fff" }}>{b.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ) : (
          <span style={{ color: "#fff" }}>Cargando balances...</span>
        )}
      </div>
      {/* Input para la cantidad y selects de exchanges/token */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <select
          value={fromExchange}
          onChange={e => setFromExchange(e.target.value)}
          style={{ width: 120 }}
        >
          {EXCHANGES.map(ex => (
            <option key={ex} value={ex}>{ex}</option>
          ))}
        </select>
        <span style={{ color: "#FFD700", fontWeight: "bold" }}>→</span>
        <select
          value={toExchange}
          onChange={e => setToExchange(e.target.value)}
          style={{ width: 120 }}
        >
          {EXCHANGES.filter(ex => ex !== fromExchange).map(ex => (
            <option key={ex} value={ex}>{ex}</option>
          ))}
        </select>
        <select
          value={token}
          onChange={e => setToken(e.target.value)}
          style={{ width: 90 }}
        >
          {TOKENS.map(tk => (
            <option key={tk} value={tk}>{tk}</option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          placeholder="Cantidad"
          value={rebalanceAmount}
          onChange={e => setRebalanceAmount(e.target.value)}
          style={{ width: 120 }}
        />
        <button
          className="btn btn-warning"
          onClick={handleManualRebalance}
          disabled={loading || !rebalanceAmount || fromExchange === toExchange}
        >
          {loading ? "Rebalanceando..." : "Rebalanceo Manual"}
        </button>
      </div>
      {/* Auto rebalanceo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button
          className={isAutoRebalance ? "btn btn-success btn-active" : "btn btn-success"}
          onClick={toggleAutoRebalance}
        >
          {isAutoRebalance ? "Rebalanceo Automático ON" : "Activar Rebalanceo Automático"}
        </button>
        <select
          value={rebalanceInterval}
          onChange={handleIntervalChange}
          className="form-select"
          style={{ width: 120 }}
          disabled={!isAutoRebalance}
        >
          <option value="10 min">10 min</option>
          <option value="1h">1h</option>
          <option value="6h">6h</option>
        </select>
      </div>
      <div>
        <b>Estado automático:</b> {isAutoRebalance ? `Activado (${rebalanceInterval})` : "Desactivado"}
      </div>
      {message && <p>{message}</p>}
    </div>
  );
}

function LogsPanel() {
  const [logs, setLogs] = useState([]);
  useEffect(() => {
    fetch(`${API_BASE}/logs`).then(res => res.json()).then(setLogs).catch(() => setLogs([]));
  }, []);
  return (
    <div className="dashboard-card">
      <div className="card-header"><span className="emoji">📝</span>Logs del Sistema</div>
      <ul>
        {logs.length === 0 ? <li>Cargando...</li> : logs.map((log, idx) => <li key={idx}>{log}</li>)}
      </ul>
    </div>
  );
}

function AddressesPanel() {
  const [addresses, setAddresses] = useState([]);
  useEffect(() => {
    fetch(`${API_BASE}/addresses`).then(res => res.json()).then(setAddresses).catch(() => setAddresses([]));
  }, []);
  return (
    <div className="dashboard-card">
      <div className="card-header"><span className="emoji">🌐</span>Direcciones y Redes</div>
      <div className="table-responsive">
        <table className="dashboard-table">
          <thead><tr><th>Exchange</th><th>Token</th><th>Dirección</th><th>Red</th></tr></thead>
          <tbody>
            {addresses.length === 0 ? (
              <tr><td colSpan="4" className="text-center py-4">Cargando...</td></tr>
            ) : addresses.map((a, idx) => (
              <tr key={idx}><td>{a.exchange}</td><td>{a.token}</td><td>{a.address}</td><td>{a.network}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FeesPanel() {
  const [fees, setFees] = useState([]);
  useEffect(() => {
    fetch(`${API_BASE}/fees`).then(res => res.json()).then(setFees).catch(() => setFees([]));
  }, []);
  return (
    <div className="dashboard-card">
      <div className="card-header"><span className="emoji">💸</span>Fees y Mínimos</div>
      <div className="table-responsive">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Exchange</th>
              <th>Token</th>
              <th>Comisión retiro</th>
              <th>Mín. retiro</th>
              <th>Mín. depósito</th>
              <th>Red</th>
            </tr>
          </thead>
          <tbody>
            {fees.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-4">Cargando...</td></tr>
            ) : fees.map((f, idx) => (
              <tr key={idx}>
                <td>{f.exchange}</td>
                <td>{f.token}</td>
                <td>{f.withdraw_fee}</td>
                <td>{f.withdraw_min}</td>
                <td>{f.deposit_min}</td>
                <td>{f.network}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricsPanel() {
  const [metrics, setMetrics] = useState(null);
  useEffect(() => {
    fetch(`${API_BASE}/metrics`).then(res => res.json()).then(setMetrics).catch(() => setMetrics(null));
  }, []);
  if (!metrics) return <div className="dashboard-card"><div className="card-header">Métricas</div><div>Cargando...</div></div>;
  return (
    <div className="dashboard-card">
      <div className="card-header"><span className="emoji">📊</span>Métricas del Bot</div>
      <div className="metric"><span className="metric-label">Total Trades</span><span className="metric-value">{metrics.trades}</span></div>
      <div className="metric"><span className="metric-label">Total Profit</span><span className="metric-value">{metrics.profit} USDT</span></div>
      <div className="metric"><span className="metric-label">Win Rate</span><span className="metric-value">{metrics.winRate}%</span></div>
    </div>
  );
}

// --- Sidebar --- 
function Sidebar({ current, setCurrent }) {
  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <img className="sidebar-logo" src={BOT_LOGO} alt="Logo" />
        <span className="sidebar-title">{BOT_NAME}</span>
        <span className="sidebar-badge">{BOT_BADGE}</span>
      </div>
      <ul className="nav flex-column">
        {sectionConfig.map((s, idx) => (
          <li key={s.label} className="nav-item">
            <span
              className={`nav-link${idx === current ? " active" : ""}`}
              onClick={() => setCurrent(idx)}
            >
              <span className="emoji">{s.emoji}</span>
              <i className={`bi ${s.icon}`}></i>
              {s.label}
            </span>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// --- Paneles para el dashboard ---
const panels = [
  <PricesPanel key={0} />,
  <OpportunitiesPanel key={1} />,
  <BalancesPanel key={2} />,
  <IAPanel key={3} />,
  <RiskPanel key={4} />,
  <RebalancePanel key={5} />,
  <LogsPanel key={6} />,
  <AddressesPanel key={7} />,
  <FeesPanel key={8} />,
  <MetricsPanel key={9} />,
  <PairsPanel key={10} />
];

// --- Dashboard Principal ---
export default function Dashboard() {
  const [current, setCurrent] = useState(0);
  const [botStatus, setBotStatus] = useState({ mode: "desconocido", isRunning: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/status`)
      .then(res => res.json())
      .then(setBotStatus)
      .catch(() => setBotStatus({ mode: "simulation", isRunning: false }));
  }, []);

  const setMode = (mode) => {
    setLoading(true);
    fetch(`${API_BASE}/set-mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode })
    })
      .then(res => res.json())
      .then(() => {
        fetch(`${API_BASE}/status`)
          .then(res => res.json())
          .then(setBotStatus);
      })
      .finally(() => setLoading(false));
  };

  // Iniciar o detener el bot
  const toggleBot = () => {
    setLoading(true);
    fetch(`${API_BASE}/${botStatus.isRunning ? "stop" : "start"}`, { method: "POST" })
      .then(res => res.json())
      .then(() => {
        setTimeout(() => {
          fetch(`${API_BASE}/status`)
            .then(res => res.json())
            .then(setBotStatus)
            .finally(() => setLoading(false));
        }, 700); // espera breve para asegurar que el backend actualice el estado
      });
  };

  return (
    <div className="dashboard-main" style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar current={current} setCurrent={setCurrent} />
      <main style={{ flex: 1 }}>
        <div className="header">
          <span className="header-title">
            <span className="header-emoji">{sectionConfig[current].emoji}</span>
            {sectionConfig[current].label}
          </span>
          {/* BLOQUE DE BOTONES DE CONTROL DEL BOT */}
          <div style={{ marginTop: 8, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            {botStatus.mode === "production" && (
              <span style={{
                background: "#28a745",
                color: "#fff",
                borderRadius: 6,
                padding: "3px 10px",
                fontWeight: "bold",
                marginRight: 10
              }}>🚨 MODO PRODUCCIÓN</span>
            )}
            {botStatus.mode === "simulation" && (
              <span style={{
                background: "#00BFFF",
                color: "#fff",
                borderRadius: 6,
                padding: "3px 10px",
                fontWeight: "bold",
                marginRight: 10
              }}>🧪 MODO SIMULACIÓN</span>
            )}

            {/* Botón Simulación */}
            <button
              className={`btn btn-primary ${botStatus.mode === "simulation" ? "btn-active" : ""}`}
              onClick={() => setMode("simulation")}
              disabled={botStatus.mode === "simulation" || loading}
              style={{ marginRight: 4, fontWeight: "bold" }}
            >
              Cambiar a Simulación
            </button>

            {/* Botón Producción */}
            <button
              className={`btn btn-success ${botStatus.mode === "production" ? "btn-active" : ""}`}
              onClick={() => setMode("production")}
              disabled={botStatus.mode === "production" || loading}
              style={{ marginRight: 4, fontWeight: "bold" }}
            >
              Cambiar a Producción
            </button>

            {/* Botón Iniciar/Detener Bot */}
            <button
              className={`btn ${botStatus.isRunning ? "btn-danger btn-active" : "btn-success"}`}
              onClick={toggleBot}
              style={{
                borderRadius: 6,
                padding: "3px 10px",
                fontWeight: "bold"
              }}
              disabled={loading}
            >
              {botStatus.isRunning ? "Detener Bot" : "Iniciar Bot"}
            </button>
          </div>
        </div>

        {/* --- MENÚ DE DOS FILAS --- */}
        <div className="controls" style={{ width: "100%", margin: "0 auto", marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 8 }}>
            {sectionConfig.slice(0, 5).map((s, idx) => (
              <button
                key={s.label}
                className={`btn ${idx === current ? "btn-primary btn-active" : "btn-outline-secondary"}`}
                onClick={() => setCurrent(idx)}
                style={{
                  minWidth: 120,
                  padding: "10px 8px",
                  fontWeight: "bold",
                  borderRadius: 10,
                }}
              >
                <span className="emoji">{s.emoji}</span> {s.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
            {sectionConfig.slice(5).map((s, idx) => (
              <button
                key={s.label}
                className={`btn ${idx + 5 === current ? "btn-primary btn-active" : "btn-outline-secondary"}`}
                onClick={() => setCurrent(idx + 5)}
                style={{
                  minWidth: 120,
                  padding: "10px 8px",
                  fontWeight: "bold",
                  borderRadius: 10,
                }}
              >
                <span className="emoji">{s.emoji}</span> {s.label}
              </button>
            ))}
          </div>
        </div>
        {/* --- FIN MENÚ DE DOS FILAS --- */}

        <div>
          {panels[current]}
        </div>
      </main>
    </div>
  );
}