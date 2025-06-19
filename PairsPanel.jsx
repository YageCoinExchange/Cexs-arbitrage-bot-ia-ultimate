import React from "react";

const pairs = [
  { pair: "LTC/USDT", icon: "https://cryptologos.cc/logos/litecoin-ltc-logo.png?v=029" },
  { pair: "BNB/USDT", icon: "https://cryptologos.cc/logos/binance-coin-bnb-logo.png?v=029" },
  { pair: "XRP/USDT", icon: "https://cryptologos.cc/logos/xrp-xrp-logo.png?v=029" }
];
const baseAsset = "USDT";

export default function PairsPanel() {
  return (
    <div className="panel">
      <h2>🔗 Pares a Monitorear</h2>
      <p><b>Activo base:</b> {baseAsset}</p>
      <table>
        <thead>
          <tr>
            <th>Token</th>
            <th>Par</th>
          </tr>
        </thead>
        <tbody>
          {pairs.map(({pair, icon}) => (
            <tr key={pair}>
              <td className="token">
                <img src={icon} alt={pair.split("/")[0]} />
                {pair.split("/")[0]}
              </td>
              <td>{pair}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}