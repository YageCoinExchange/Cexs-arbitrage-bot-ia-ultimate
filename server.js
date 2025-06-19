const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { Spot } = require('@binance/connector');
const { RestClientV5 } = require('bybit-api');
const riskRoutes = require('./routes/risk');


const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', require('./routes/config'));
app.use('/api/risk', riskRoutes);

// === GLOBAL BOT MODE STATE ===
let botMode = process.env.TRADING_MODE || "simulation"; // "simulation" or "production"
let botIsRunning = true; // Puedes ajustar esta bandera según lógica real del bot

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

// === ENDPOINT: STATUS (para frontend) ===
app.get("/api/status", (req, res) => {
  res.json({
    mode: botMode,
    isRunning: botIsRunning
  });
});

// === ENDPOINT: SET MODE (activar/desactivar modo producción/simulación) ===
app.post("/api/set-mode", (req, res) => {
  const { mode } = req.body;
  if (mode !== "simulation" && mode !== "production") {
    return res.status(400).json({ ok: false, error: "Modo inválido" });
  }
  botMode = mode;
  // Aquí podrías agregar lógica para pausar/reanudar el bot real si es necesario
  res.json({ ok: true, mode: botMode });
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

  
// === ENDPOINT: COMMISSIONS (TRADING Y DEPÓSITO) ===
app.get("/api/commissions", (req, res) => {
  res.json([
    { exchange: "BINANCE", trading_fee: 0.1, deposit_fee: 0 },
    { exchange: "BYBIT", trading_fee: 0.1, deposit_fee: 0 }
  ]);
}),
   
// === ENDPOINT: RISK CONTROL (UMBRAL OPERACIÓN) ===
app.get("/api/risk", (req, res) => {
  res.json([
    { exchange: "BINANCE", min_trade: 10, max_trade: null },
    { exchange: "BYBIT", min_trade: 10, max_trade: null }
  ]);
});

// === ENDPOINT: ADDRESSES (DIRECCIONES) ===
app.get("/api/addresses", (req, res) => {
  res.json([
    // BINANCE
    { exchange: "BINANCE", token: "USDT", address: "EQD5mxRgCuRNLxKxeOjG6r14iSroLF5FtomPnet-sgP5xNJb", network: "TON", memo: "163771801" },
    { exchange: "BINANCE", token: "LTC", address: "LiCH4dMWM6YRHFWYC78hppAk1SwUFkDAK4", network: "Litecoin" },
    { exchange: "BINANCE", token: "BNB", address: "0xe5b10a8fa449155d5b4b657dab4e856815d52bd7", network: "BEP20 (BSC)" },
    { exchange: "BINANCE", token: "XRP", address: "rNxp4h8apvRis6mJf9Sh8C6iRxfrDWN7AV", tag: "466152795", network: "XRP" },
    // BYBIT
    { exchange: "BYBIT", token: "USDT", address: "UQCT1S9xDKxJV7zpOYNpnof-_xym-dG7W3TYxeGLxLKSSSvB", network: "TON" },
    { exchange: "BYBIT", token: "LTC", address: "LLCxH3L5fn9ejTPVk3nWTJcqvvTWsu2LbJ", network: "Litecoin" },
    { exchange: "BYBIT", token: "BNB", address: "0x4231d188a91481a8c3d39d444b7451436babee94", network: "BEP20 (BSC)" },
    { exchange: "BYBIT", token: "XRP", address: "rJn2zAPdFA193sixJwuFixRkYDUtx3apQh", tag: "501350199", network: "XRP" }
  ]);
});
// === ENDPOINT: FEES (COMISIONES Y MÍNIMOS) ===
app.get("/api/fees", (req, res) => {
  res.json([
    // BINANCE
    { exchange: "BINANCE", token: "USDT", withdraw_fee: 0.20, withdraw_min: 10, deposit_min: 0.002, network: "TON" },
    { exchange: "BINANCE", token: "LTC", withdraw_fee: 0.0001, withdraw_min: 0.002, deposit_min: 0.002, network: "Litecoin" },
    { exchange: "BINANCE", token: "BNB", withdraw_fee: 0.00001, withdraw_min: 0.0005, deposit_min: 0.000003, network: "BEP20 (BSC)" },
    { exchange: "BINANCE", token: "XRP", withdraw_fee: 0.2, withdraw_min: 2, deposit_min: 0.001, network: "XRP" },
    // BYBIT
    { exchange: "BYBIT", token: "USDT", withdraw_fee: 0.3, withdraw_min: 1, deposit_min: 0.001, network: "TON" },
    { exchange: "BYBIT", token: "LTC", withdraw_fee: 0.0001, withdraw_min: 0.001, deposit_min: 0.00000001, network: "Litecoin" },
    { exchange: "BYBIT", token: "BNB", withdraw_fee: 0.0002, withdraw_min: 0.0002, deposit_min: 0, network: "BEP20 (BSC)" },
    { exchange: "BYBIT", token: "XRP", withdraw_fee: 0.2, withdraw_min: 1.2, deposit_min: 0.01, network: "XRP" }
  ]);
});
// === ENDPOINT: MÉTRICAS (BALANCES INICIALES, ETC.) ===
app.get("/api/metrics", (req, res) => {
  res.json({
    binance: { initial_balance_usdt: 20 },
    bybit: { initial_balance_usdt: 20 },
    trades: 150,
    profit: 32.7,
    winRate: 78.5
  });
});
// === ENDPOINT: INICIAR EL BOT ===
app.post("/api/start", (req, res) => {
  botIsRunning = true;
  res.json({ ok: true, isRunning: true });
});

// === ENDPOINT: DETENER EL BOT ===
app.post("/api/stop", (req, res) => {
  botIsRunning = false;
  res.json({ ok: true, isRunning: false });
});

app.listen(8888, () => {
  console.log("Backend API listening on http://localhost:8888/");
});