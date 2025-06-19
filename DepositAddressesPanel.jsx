import React from "react";

const data = [
  {
    exchange: "BINANCE",
    tokens: [
      { symbol: "USDC", address: "EQD5mxRgCuRNLxKxeOjG6r14iSroLF5FtomPnet-sgP5xNJb", memo: "163771801", network: "TON", min: "0.002 USDT" },
      { symbol: "LTC", address: "LiCH4dMWM6YRHFWYC78hppAk1SwUFkDAK4", network: "Litecoin", min: "0.002 LTC" },
      { symbol: "BNB", address: "0xe5b10a8fa449155d5b4b657dab4e856815d52bd7", network: "BEP20 (BSC)", min: "0.000003 BNB" },
      { symbol: "XRP", address: "rNxp4h8apvRis6mJf9Sh8C6iRxfrDWN7AV", tag: "466152795", network: "Ripple", min: "0.001 XRP" }
    ]
  },
  {
    exchange: "BYBIT",
    tokens: [
      { symbol: "USDT", address: "UQCT1S9xDKxJV7zpOYNpnof-_xym-dG7W3TYxeGLxLKSSSvB", network: "TON", min: "0.001 USDT" },
      { symbol: "LTC", address: "LLCxH3L5fn9ejTPVk3nWTJcqvvTWsu2LbJ", network: "Litecoin", min: "0.00000001 LTC" },
      { symbol: "BNB", address: "0x4231d188a91481a8c3d39d444b7451436babee94", network: "BEP20 (BSC)", min: "0.000 BNB" },
      { symbol: "XRP", address: "rJn2zAPdFA193sixJwuFixRkYDUtx3apQh", tag: "501350199", network: "Ripple", min: "0.01 XRP" }
    ]
  }
];

export default function DepositAddressesPanel() {
  return (
    <div className="panel">
      <h2>🏦 Direcciones y Redes de Depósito</h2>
      {data.map(({exchange, tokens}) => (
        <div key={exchange}>
          <h3>{exchange}</h3>
          <table>
            <thead>
              <tr>
                <th>Token</th>
                <th>Dirección</th>
                <th>Red</th>
                <th>Memo/Tag</th>
                <th>Mín. Depósito</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map(t => (
                <tr key={t.symbol}>
                  <td>{t.symbol}</td>
                  <td style={{fontFamily:"monospace"}}>{t.address}</td>
                  <td>{t.network}</td>
                  <td>{t.memo || t.tag || "-"}</td>
                  <td>{t.min}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}