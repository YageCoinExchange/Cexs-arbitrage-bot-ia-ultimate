import React from "react";

// Tabla de fees y mínimos para cada token/red/exchange
const FEES = {
  LTC: {
    binance: {
      withdraw: 0.0001,
      withdrawMin: 0.002,
      trade: 0.001, // 0.1%
      deposit: 0,
      depositMin: 0.002,
    },
    bybit: {
      withdraw: 0.0001,
      withdrawMin: 0.001,
      trade: 0.001,
      deposit: 0,
      depositMin: 0.00000001,
    },
  },
  BNB: {
    binance: {
      withdraw: 0.00001,
      withdrawMin: 0.0005,
      trade: 0.001,
      deposit: 0,
      depositMin: 0.000003,
    },
    bybit: {
      withdraw: 0.0002,
      withdrawMin: 0.0002,
      trade: 0.001,
      deposit: 0,
      depositMin: 0,
    },
  },
  XRP: {
    binance: {
      withdraw: 0.2,
      withdrawMin: 2,
      trade: 0.001,
      deposit: 0,
      depositMin: 0.001,
    },
    bybit: {
      withdraw: 0.2,
      withdrawMin: 1.2,
      trade: 0.001,
      deposit: 0,
      depositMin: 0.01,
    },
  },
  USDT: {
    binance: {
      withdraw: 0.2,
      withdrawMin: 10,
      trade: 0.001,
      deposit: 0,
      depositMin: 0.002,
    },
    bybit: {
      withdraw: 0.3,
      withdrawMin: 1,
      trade: 0.001,
      deposit: 0,
      depositMin: 0.001,
    },
  },
};

const STABLECOINS = ["USDT", "USDC", "BUSD", "DAI"];

// Calcula el profit neto después de comisiones y mínimos
function calcProfitNeto(op, prices) {
  const [sym] = op.pair.split("/");
  const base = op.buyExchange.toLowerCase(); // binance o bybit
  const target = op.sellExchange.toLowerCase();

  // Precios de compra y venta (en USDT)
  const priceCompra = prices[sym]?.[base];
  const priceVenta = prices[sym]?.[target];
  if (!priceCompra || !priceVenta) return null;

  const monto = Number(op.amount);

  // Validar contra mínimos de retiro y depósito
  if (
    monto < FEES[sym][base].withdrawMin ||
    monto < FEES[sym][target].depositMin
  )
    return null;

  // Fees
  const feeTradeBuy = monto * FEES[sym][base].trade;
  const feeRetiro = FEES[sym][base].withdraw;
  const feeTradeSell =
    (monto - feeTradeBuy - feeRetiro) * FEES[sym][target].trade;
  const totalTokenRecibido =
    monto - feeTradeBuy - feeRetiro - feeTradeSell;

  // Profit neto en USDT
  const usdtFinal = totalTokenRecibido * priceVenta;
  const usdtInicial = monto * priceCompra;
  const profitNeto = usdtFinal - usdtInicial;
  const profitNetoPct = ((profitNeto / usdtInicial) * 100).toFixed(2);

  return { profitNeto, profitNetoPct };
}

function isStablecoinPair(pair) {
  const tokens = pair.split("/");
  return (
    STABLECOINS.includes(tokens[0]) && STABLECOINS.includes(tokens[1])
  );
}

function OpportunitiesPanel({ prices }) {
  const [opps, setOpps] = React.useState([]);

  React.useEffect(() => {
    // Cambia la URL por la de tu backend real
    fetch("http://localhost:8888/api/opportunities")
      .then((res) => res.json())
      .then((res) => {
        if (Array.isArray(res)) setOpps(res);
        else if (Array.isArray(res.data)) setOpps(res.data);
        else setOpps([]);
      })
      .catch(() => setOpps([]));
  }, []);

  // Filtros realistas para bajo presupuesto y oportunidades alcanzables
  const MAX_AMOUNT = 50; // Monto máximo por operación

  const filteredOpps = Array.isArray(opps)
    ? opps
        .filter(
          (op) =>
            !isStablecoinPair(op.pair) &&
            Number(op.amount) <= MAX_AMOUNT
        )
        .map((op) => {
          const profitNet = calcProfitNeto(op, prices);
          return profitNet
            ? { ...op, profitNeto: profitNet.profitNeto, profitNetoPct: profitNet.profitNetoPct }
            : null;
        })
        .filter(
          (op) =>
            op &&
            op.profitNeto > 0.10 // Solo si el profit neto es mayor a 10 centavos
        )
    : [];

  return (
    <div className="dashboard-card">
      <div className="card-header">
        <span className="emoji">💰</span>Oportunidades Realistas de Arbitraje
      </div>
      <div className="table-responsive">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Par</th>
              <th>Exchanges</th>
              <th>Profit Neto</th>
              <th>Profit Neto %</th>
              <th>Confianza</th>
              <th>Monto</th>
              <th>Tiempo</th>
            </tr>
          </thead>
          <tbody>
            {filteredOpps.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-4">
                  No hay oportunidades realistas en este momento.
                </td>
              </tr>
            ) : (
              filteredOpps.map((op, idx) => (
                <tr key={idx}>
                  <td>{op.pair}</td>
                  <td>
                    {op.buyExchange} → {op.sellExchange}
                  </td>
                  <td className={op.profitNeto > 0 ? "text-success" : "text-danger"}>
                    {op.profitNeto ? op.profitNeto.toFixed(3) + " USDT" : "-"}
                  </td>
                  <td className={op.profitNetoPct > 0 ? "text-success" : "text-danger"}>
                    {op.profitNetoPct ? op.profitNetoPct + " %" : "-"}
                  </td>
                  <td>
                    <div className="progress" style={{ height: "6px" }}>
                      <div
                        className="progress-bar bg-success"
                        style={{ width: (op.confidence * 100) + "%" }}
                      ></div>
                    </div>
                    <small>{(op.confidence * 100).toFixed(1)}%</small>
                  </td>
                  <td>{op.amount} {op.pair.split("/")[0]}</td>
                  <td>{op.time}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: "0.9em", marginTop: 10, color: "#888" }}>
        * El profit neto ya descuenta fees de trading, retiro y mínimos de cada red/exchange.<br />
        * Solo se muestran oportunidades que puedes aprovechar con bajo presupuesto.<br />
        * No se muestran oportunidades entre stablecoins.
      </div>
    </div>
  );
}

export default OpportunitiesPanel;