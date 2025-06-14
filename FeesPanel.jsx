import React from "react";

const feeData = [
  {
    exchange: "BINANCE",
    tokens: [
      { symbol: "USDC", withdrawFee: "0.20 USDC", minWithdraw: "10 USDC" },
      { symbol: "LTC", withdrawFee: "0.0001 LTC", minWithdraw: "0.002 LTC" },
      { symbol: "BNB", withdrawFee: "0.00001 BNB", minWithdraw: "0.0005 BNB" },
      { symbol: "XRP", withdrawFee: "0.2 XRP", minWithdraw: "2 XRP" }
    ],
    tradingFee: "0.1%",
    depositFee: "0"
  },
  {
    exchange: "BYBIT",
    tokens: [
      { symbol: "USDC", withdrawFee: "0.3 USDT", minWithdraw: "1 USDC" },
      { symbol: "LTC", withdrawFee: "0.0001 LTC", minWithdraw: "0.001 LTC" },
      { symbol: "BNB", withdrawFee: "0.0002 BNB", minWithdraw: "0.0002 BNB" },
      { symbol: "XRP", withdrawFee: "0.2 XRP", minWithdraw: "1.2 XRP" }
    ],
    tradingFee: "0.1%",
    depositFee: "0"
  }
];

export default function FeesPanel() {
  return (
    <div className="panel">
      <h2>💸 Fees y Mínimos</h2>
      {feeData.map(ex => (
        <div key={ex.exchange}>
          <h3>{ex.exchange}</h3>
          <p><b>Fee de trading:</b> {ex.tradingFee} | <b>Fee de depósito:</b> {ex.depositFee}</p>
          <table>
            <thead>
              <tr>
                <th>Token</th>
                <th>Comisión retiro</th>
                <th>Mín. retiro</th>
              </tr>
            </thead>
            <tbody>
              {ex.tokens.map(t => (
                <tr key={t.symbol}>
                  <td>{t.symbol}</td>
                  <td>{t.withdrawFee}</td>
                  <td>{t.minWithdraw}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}