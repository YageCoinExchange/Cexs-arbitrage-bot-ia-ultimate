import React, { useState, useEffect } from "react";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./dashboard-pro.css";
import OpportunitiesPanel from '../components/OpportunitiesPanel';

// Configura la URL de tu backend aquí:
const API_BASE = "http://localhost:8000/api";

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
  { emoji: "📊", label: "Métricas", icon: "bi-bar-chart" }
];

const PAIRS = [
  { symbol: "LTCUSDT", display: "LTC/USDT", icon: "https://i.postimg.cc/QtnQV83h/litecoin.jpg" },
  { symbol: "BNBUSDT", display: "BNB/USDT", icon: "https://i.postimg.cc/ZnBrdGb3/bnb.png" },
  { symbol: "XRPUSDT", display: "XRP/USDT", icon: "https://i.postimg.cc/4yDpbWy0/xrp.png" }
];
const EXCHANGES = ["Binance", "Bybit"];

// --- Paneles ---

function PricesPanel() {
  const [prices, setPrices] = useState({});

  // WebSocket Binance
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

  // WebSocket Bybit (adaptado a data como objeto)
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
          // msg.data es un objeto, no array
          if (msg.topic && msg.data && msg.data.symbol && msg.data.lastPrice) {
            setPrices(prev => ({
              ...prev,
              [msg.data.symbol]: {
                ...(prev[msg.data.symbol] || {}),
                bybit: msg.data.lastPrice
              }
            }));
          }
        } catch (e) {
          // Opcional: console.log("Bybit parse error", e);
        }
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

  // Calcular spread y spread%
  const calcDiff = (bin, byb) => {
    if (!bin || !byb || isNaN(bin) || isNaN(byb)) return ["-", "-"];
    const diff = parseFloat(byb) - parseFloat(bin);
    const pct = ((diff / parseFloat(bin)) * 100).toFixed(3);
    return [diff.toFixed(4), pct];
  };

  return (
    <div className="dashboard-card">
      <div className="card-header"><span className="emoji">📈</span>Precios y Spread en Tiempo Real</div>
      <div className="table-responsive">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Par</th>
              <th>Binance</th>
              <th>Bybit</th>
              <th>Spread</th>
              <th>Spread %</th>
            </tr>
          </thead>
          <tbody>
            {PAIRS.map(pair => {
              const data = prices[pair.symbol] || {};
              const bin = data.binance ? parseFloat(data.binance) : null;
              const byb = data.bybit ? parseFloat(data.bybit) : null;
              const [diff, diffPct] = calcDiff(bin, byb);
              return (
                <tr key={pair.symbol}>
                  <td>
                    <img src={pair.icon} alt={pair.symbol} style={{ width: 22, marginRight: 8, borderRadius: 6 }} />
                    {pair.symbol} {pair.display && pair.display !== pair.symbol ? pair.display : ""}
                  </td>
                  <td>{bin !== null ? bin : <span className="text-muted">-</span>}</td>
                  <td>{byb !== null ? byb : <span className="text-muted">-</span>}</td>
                  <td className={diff > 0 ? "text-success" : diff < 0 ? "text-danger" : ""}>{diff}</td>
                  <td className={diffPct > 0 ? "text-success" : diffPct < 0 ? "text-danger" : ""}>{diffPct !== "-" ? diffPct + " %" : "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
      <div className="card-header" style={{color: "#FFD700", fontWeight: "bold", fontSize: "1.1em", letterSpacing: "1px"}}>Balances</div>
      <div style={{color: "#fff", fontWeight: "bold"}}>Cargando...</div>
    </div>
  );

  return (
    <div className="dashboard-card">
      <div className="card-header" style={{color: "#FFD700", fontWeight: "bold", fontSize: "1.1em", letterSpacing: "1px"}}>
        <span className="emoji">💳</span>Balances por Exchange
      </div>
      {EXCHANGES.map(ex => (
        <div key={ex}>
          <h6 className="mt-3" style={{color: "#FFD700", fontWeight: "bold", fontSize: "1.1em", letterSpacing: "1px"}}>{ex.charAt(0).toUpperCase() + ex.slice(1)}</h6>
          <div className="table-responsive">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th style={{color: "#FFD700", fontWeight: "bold", fontSize: "1.1em", letterSpacing: "1px"}}>Token</th>
                  <th style={{color: "#FFD700", fontWeight: "bold", fontSize: "1.1em", letterSpacing: "1px"}}>Disponible</th>
                  <th style={{color: "#FFD700", fontWeight: "bold", fontSize: "1.1em", letterSpacing: "1px"}}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(balances[ex] || PAIRS.map(pair => ({token: pair.symbol.replace('USDT', ''), available: 0, total: 0}))).map(bal => (
                  <tr key={bal.token}>
                    <td style={{color: "#fff", fontWeight: "bold"}}>{bal.token}</td>
                    <td style={{color: "#fff", fontWeight: "bold"}}>{bal.available}</td>
                    <td style={{color: "#fff", fontWeight: "bold"}}>{bal.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function IAPanel() {
  return (
    <div className="dashboard-card">
      <div className="card-header"><span className="emoji">🧠</span>Panel de IA & Estrategia</div>
      <div>
        <div className="metric"><span className="metric-label">Estrategia actual:</span><span className="metric-value">Arbitraje Dinámico IA</span></div>
        <div className="metric"><span className="metric-label">Modo Simulación:</span><span className="metric-value">Desactivado</span></div>
        <div className="metric"><span className="metric-label">AI Confidence:</span><span className="metric-value">98%</span></div>
      </div>
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
  return (
    <div className="dashboard-card">
      <div className="card-header"><span className="emoji">🔄</span>Panel de Rebalanceo</div>
      <div className="metric"><span className="metric-label">Último rebalanceo:</span><span className="metric-value">Hace 2h</span></div>
      <div className="metric"><span className="metric-label">Auto-rebalanceo:</span><span className="metric-value">Activado</span></div>
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
          <thead><tr><th>Exchange</th><th>Token</th><th>Comisión retiro</th><th>Mín. retiro</th></tr></thead>
          <tbody>
            {fees.length === 0 ? (
              <tr><td colSpan="4" className="text-center py-4">Cargando...</td></tr>
            ) : fees.map((f, idx) => (
              <tr key={idx}><td>{f.exchange}</td><td>{f.token}</td><td>{f.withdraw}</td><td>{f.min}</td></tr>
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
  <MetricsPanel key={9} />
];

// --- Dashboard Principal ---
export default function Dashboard() {
  const [current, setCurrent] = useState(0);
  return (
    <div style={{display:"flex"}}>
      <Sidebar current={current} setCurrent={setCurrent} />
      <main className="main-content">
        <div className="header">
          <span className="header-title">
            <span className="header-emoji">{sectionConfig[current].emoji}</span>
            {sectionConfig[current].label}
          </span>
          <div className="controls">
            {sectionConfig.map((s, idx) => (
              <button
                key={s.label}
                className={`btn ${idx === current ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => setCurrent(idx)}
              >
                <span className="emoji">{s.emoji}</span> {s.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          {panels[current]}
        </div>
      </main>
    </div>
  );
}