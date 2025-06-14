const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { Spot } = require('@binance/connector');
const { RestClientV5 } = require('bybit-api');

const app = express();
app.use(cors());
app.use(express.json());

// === BINANCE SETUP ===
const binance = new Spot(process.env.BINANCE_API_KEY, process.env.BINANCE_API_SECRET);

// === BYBIT SETUP ===
const bybit = new RestClientV5({
  key: process.env.BYBIT_API_KEY,
  secret: process.env.BYBIT_API_SECRET,
  testnet: false
});

// === ENDPOINT: BALANCES ===
app.get("/api/balances", async (req, res) => {
  const tokens = ["USDT", "XRP", "BNB", "LTC"];

  // Binance
  let binanceList = [];
  try {
    const binanceAccount = await binance.accountInfo();
    binanceList = tokens.map(token => {
      const balance = binanceAccount.balances.find(b => b.asset === token) || { free: "0", locked: "0" };
      return {
        token,
        available: parseFloat(balance.free),
        total: parseFloat(balance.free) + parseFloat(balance.locked)
      };
    });
  } catch (e) {
    binanceList = tokens.map(token => ({ token, available: 0, total: 0 }));
  }

  // Bybit
  let bybitList = [];
  try {
    const bybitAccount = await bybit.getWalletBalance({ accountType: "SPOT" });
    const coins = (bybitAccount.result && bybitAccount.result.list && bybitAccount.result.list[0].coins) ? bybitAccount.result.list[0].coins : [];
    bybitList = tokens.map(token => {
      const coin = coins.find(c => c.coin === token) || { availableToWithdraw: "0", walletBalance: "0" };
      return {
        token,
        available: parseFloat(coin.availableToWithdraw),
        total: parseFloat(coin.walletBalance)
      };
    });
  } catch (e) {
    bybitList = tokens.map(token => ({ token, available: 0, total: 0 }));
  }

  res.json({
    binance: binanceList,
    bybit: bybitList
  });
});

// === ENDPOINT: OPORTUNIDADES DE ARBITRAJE ===
app.get("/api/opportunities", async (req, res) => {
  try {
    // 1. Lista de símbolos a comparar
    const symbolList = ["LTCUSDT", "BNBUSDT", "XRPUSDT"];

    // 2. --- BINANCE ---
    const binTickersResponse = await binance.tickerPrice();
    const binTickers = binTickersResponse.data;
    const binancePrices = {};
    binTickers.forEach(t => {
      if (symbolList.includes(t.symbol)) {
        binancePrices[t.symbol] = parseFloat(t.price);
      }
    });

    // 3. --- BYBIT ---
    const bybitPrices = {};
    const bybTickersObj = await bybit.getTickers({ category: "spot" });
    const bybTickers = (bybTickersObj.result && bybTickersObj.result.list) ? bybTickersObj.result.list : [];
    bybTickers.forEach(t => {
      if (symbolList.includes(t.symbol)) {
        bybitPrices[t.symbol] = parseFloat(t.lastPrice);
      }
    });

    // 4. Logs para depurar antes del cálculo de oportunidades
    console.log("Binance prices:", binancePrices);
    console.log("Bybit prices:", bybitPrices);

    // 5. --- LÓGICA DE ARBITRAJE ---
    const opps = [];
    symbolList.forEach(symbol => {
      const binPrice = binancePrices[symbol];
      const bybPrice = bybitPrices[symbol];

      if (binPrice && bybPrice) {
        // Oportunidad: Comprar en Binance, vender en Bybit
        const spreadBybit = ((bybPrice - binPrice) / binPrice) * 100;
        if (spreadBybit > 0.2) {
          opps.push({
            pair: symbol.replace("USDT", "/USDT"),
            buyExchange: "Binance",
            sellExchange: "Bybit",
            profit: spreadBybit.toFixed(2),
            direction: "Binance -> Bybit",
            time: new Date().toLocaleTimeString()
          });
        }
        // Oportunidad: Comprar en Bybit, vender en Binance
        const spreadBinance = ((binPrice - bybPrice) / bybPrice) * 100;
        if (spreadBinance > 0.2) {
          opps.push({
            pair: symbol.replace("USDT", "/USDT"),
            buyExchange: "Bybit",
            sellExchange: "Binance",
            profit: spreadBinance.toFixed(2),
            direction: "Bybit -> Binance",
            time: new Date().toLocaleTimeString()
          });
        }
      }
    });

    console.log("Oportunidades encontradas:", opps);
    res.json(opps);
  } catch (err) {
    console.log("ERROR REAL EN /api/opportunities:", err);
    res.status(500).json({ error: err.toString() });
  }
});

// === ENDPOINT ALIAS EN ESPAÑOL (opcional, para compatibilidad) ===
app.get("/api/oportunidades", async (req, res) => {
  // Simplemente llama al endpoint inglés
  req.url = "/api/opportunities";
  app._router.handle(req, res);
});

// === ENDPOINTS SIMPLES (puedes expandir a APIs reales según tus necesidades) ===
app.get("/api/logs", (req, res) => {
  res.json(["Bot iniciado", "Trade ejecutado: LTC/USDT", "Balance actualizado"]);
});
app.get("/api/addresses", (req, res) => {
  res.json([
    { exchange: "BINANCE", token: "USDT", address: "EQD5mxRg...", network: "TON" },
    { exchange: "BYBIT", token: "USDT", address: "UQCT1S9x...", network: "TON" }
  ]);
});
app.get("/api/fees", (req, res) => {
  res.json([
    { exchange: "BINANCE", token: "USDT", withdraw: "0.2", min: "10" },
    { exchange: "BYBIT", token: "USDT", withdraw: "0.3", min: "1" }
  ]);
});
app.get("/api/metrics", (req, res) => {
  res.json({ trades: 150, profit: 32.7, winRate: 78.5 });
});

app.listen(8000, () => {
  console.log("Backend API listening on http://localhost:8000/");
});