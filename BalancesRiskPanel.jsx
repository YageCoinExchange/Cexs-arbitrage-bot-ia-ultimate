import React from "react";

export default function BalancesRiskPanel() {
  return (
    <div className="panel">
      <h2>💼 Balances Iniciales & Control de Riesgo</h2>
      <h3>Balances Iniciales</h3>
      <table>
        <thead>
          <tr>
            <th>Exchange</th>
            <th>USDT</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>BINANCE</td>
            <td>20</td>
          </tr>
          <tr>
            <td>BYBIT</td>
            <td>20</td>
          </tr>
        </tbody>
      </table>
      <h3>Umbrales y Control de Riesgo</h3>
      <table>
        <thead>
          <tr>
            <th>Exchange</th>
            <th>Mín/Máx x operación</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>BINANCE</td>
            <td>10</td>
          </tr>
          <tr>
            <td>BYBIT</td>
            <td>10</td>
          </tr>
        </tbody>
      </table>
      <p><b>Spread mínimo para arbitraje:</b> 
        <span style={{color: "#23408e"}}> 0.2% recomendado</span>
      </p>
      <p><b>Slippage máximo tolerado:</b> 
        <span style={{color: "#23408e"}}> 0.15% recomendado</span>
      </p>
      <h3>Límites y Regulaciones</h3>
      <ul>
        <li><b>Límites de retiro/trading:</b> Ninguno (ambos exchanges)</li>
        <li><b>Restricciones/regulaciones por país:</b> Ninguno</li>
      </ul>
    </div>
  );
}