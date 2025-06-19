const express = require("express");
const config = require("../strategies/config");
const fs = require("fs");
const path = require("path");

const router = express.Router();

/* ===========================
   CONFIGURACIÓN GENERAL
   =========================== */
router.get("/config", (req, res) => {
  res.json(config);
});

router.post("/config", (req, res) => {
  // Actualizar config.js en disco. (Requiere reinicio del bot para efectos completos.)
  const newConfig = req.body;
  const configPath = path.join(__dirname, "../strategies/config.js");
  fs.writeFileSync(
    configPath,
    "module.exports = " + JSON.stringify(newConfig, null, 2)
  );
  res.json({ ok: true });
});

/* ===========================
   ENDPOINTS MÍNIMOS PARA DASHBOARD
   =========================== */
router.get("/metrics", (req, res) => {
  const metrics = {
    totalTrades: 123,
    totalProfit: 456.78,
    uptime: "24h 13m",
    winRate: "67%",
    openPositions: 4,
    closedPositions: 119,
    currentBalance: 15234.56,
    startTime: "2025-06-12 12:00:00"
  };
  res.json(metrics);
});

router.get("/commissions", (req, res) => {
  const commissions = [
    { exchange: "Binance", type: "maker", fee: 0.1 },
    { exchange: "Binance", type: "taker", fee: 0.2 },
    { exchange: "Kraken", type: "maker", fee: 0.16 },
    { exchange: "Kraken", type: "taker", fee: 0.26 },
    { exchange: "Bitfinex", type: "maker", fee: 0.1 }
  ];
  res.json(commissions);
});

router.get("/alerts", (req, res) => {
  res.json(config.ALERTS || [
    { id: 1, type: "info", message: "Bot iniciado correctamente.", timestamp: "2025-06-13 07:00:00" },
    { id: 2, type: "warning", message: "Balance bajo en Binance.", timestamp: "2025-06-13 06:50:00" }
  ]);
});

/* ===========================
   EXCHANGES
   =========================== */
router.get("/exchanges", (req, res) => {
  res.json(config.EXCHANGES);
});

router.post("/exchanges", (req, res) => {
  config.EXCHANGES = req.body;
  res.json({ ok: true });
});

/* ===========================
   ESTRATEGIAS
   =========================== */
router.get("/strategies", (req, res) => {
  res.json(config.STRATEGIES);
});

router.post("/strategies", (req, res) => {
  config.STRATEGIES = req.body;
  res.json({ ok: true });
});

/* ===========================
   RISK MANAGEMENT
   =========================== */
router.get("/risk", (req, res) => {
  res.json(config.RISK_MANAGEMENT);
});

router.post("/risk", (req, res) => {
  config.RISK_MANAGEMENT = req.body;
  res.json({ ok: true });
});

/* ===========================
   PORTFOLIO
   =========================== */
router.get("/portfolio", (req, res) => {
  res.json(config.PORTFOLIO);
});

router.post("/portfolio", (req, res) => {
  config.PORTFOLIO = req.body;
  res.json({ ok: true });
});

/* ===========================
   AI
   =========================== */
router.get("/ai", (req, res) => {
  res.json(config.AI_TRADING);
});

router.post("/ai", (req, res) => {
  config.AI_TRADING = req.body;
  res.json({ ok: true });
});

/* ===========================
   BACKTESTING
   =========================== */
router.get("/backtesting", (req, res) => {
  res.json(config.BACKTESTING);
});

router.post("/backtesting", (req, res) => {
  config.BACKTESTING = req.body;
  res.json({ ok: true });
});

/* ===========================
   MOBILE API
   =========================== */
router.get("/mobile-api", (req, res) => {
  res.json(config.MOBILE_API);
});

router.post("/mobile-api", (req, res) => {
  config.MOBILE_API = req.body;
  res.json({ ok: true });
});

/* ===========================
   DASHBOARD
   =========================== */
router.get("/dashboard", (req, res) => {
  res.json(config.DASHBOARD);
});

router.post("/dashboard", (req, res) => {
  config.DASHBOARD = req.body;
  res.json({ ok: true });
});

/* ===========================
   LOGS
   =========================== */
router.get("/logging", (req, res) => {
  res.json(config.LOGGING);
});

router.post("/logging", (req, res) => {
  config.LOGGING = req.body;
  res.json({ ok: true });
});

/* ===========================
   MONITORING
   =========================== */
router.get("/monitoring", (req, res) => {
  res.json(config.MONITORING);
});

router.post("/monitoring", (req, res) => {
  config.MONITORING = req.body;
  res.json({ ok: true });
});

/* ===========================
   SECURITY
   =========================== */
router.get("/security", (req, res) => {
  res.json(config.SECURITY);
});

router.post("/security", (req, res) => {
  config.SECURITY = req.body;
  res.json({ ok: true });
});

/* ===========================
   TROUBLESHOOTING
   =========================== */
router.get("/troubleshooting", (req, res) => {
  const manualPath = path.join(__dirname, "../../Manual_Completo_del_Bot_La_Biblia.txt");
  let content = "";
  try {
    content = fs.readFileSync(manualPath, "utf8");
  } catch (e) {
    content = "Manual no encontrado.";
  }
  res.json({ manual: content });
});

module.exports = router;