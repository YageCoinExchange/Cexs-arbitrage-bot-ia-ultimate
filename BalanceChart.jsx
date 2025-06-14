import React from "react"

const titleStyle = {
  color: "#FFD700", // amarillo
  fontWeight: "bold",
  fontSize: "1.1em",
  letterSpacing: "1px"
}

const cellStyle = {
  color: "#fff", // blanco para cifras
  fontWeight: "bold"
}

const BalancesTable = ({ balances }) => (
  <div>
    <div style={{marginBottom: 24}}>
      <div style={titleStyle}>Binance</div>
      <table style={{width: "100%"}}>
        <thead>
          <tr>
            <th style={titleStyle}>Token</th>
            <th style={titleStyle}>Disponible</th>
            <th style={titleStyle}>Total</th>
          </tr>
        </thead>
        <tbody>
          {balances?.binance?.map(b => (
            <tr key={b.token}>
              <td style={cellStyle}>{b.token}</td>
              <td style={cellStyle}>{b.available}</td>
              <td style={cellStyle}>{b.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div>
      <div style={titleStyle}>Bybit</div>
      <table style={{width: "100%"}}>
        <thead>
          <tr>
            <th style={titleStyle}>Token</th>
            <th style={titleStyle}>Disponible</th>
            <th style={titleStyle}>Total</th>
          </tr>
        </thead>
        <tbody>
          {balances?.bybit?.map(b => (
            <tr key={b.token}>
              <td style={cellStyle}>{b.token}</td>
              <td style={cellStyle}>{b.available}</td>
              <td style={cellStyle}>{b.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

export default BalancesTable