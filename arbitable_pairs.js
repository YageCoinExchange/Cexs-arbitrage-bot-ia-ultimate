const axios = require("axios");

async function getBinanceSpotPairsUSDT() {
  const url = "https://api.binance.com/api/v3/exchangeInfo";
  const res = await axios.get(url);
  return res.data.symbols
    .filter(s => s.quoteAsset === "USDT" && s.status === "TRADING" && s.isSpotTradingAllowed)
    .map(s => s.symbol);
}

async function getBybitSpotPairsUSDT() {
  const url = "https://api.bybit.com/v5/market/instruments-info?category=spot";
  const res = await axios.get(url);
  return res.data.result.list
    .filter(s => s.quoteCoin === "USDT" && s.status === "Trading")
    .map(s => s.symbol);
}

async function main() {
  const [binancePairs, bybitPairs] = await Promise.all([
    getBinanceSpotPairsUSDT(),
    getBybitSpotPairsUSDT()
  ]);

  // Solo los pares que existen en ambos exchanges
  const binanceSet = new Set(binancePairs);
  const bybitSet = new Set(bybitPairs);

  const arbitrable = [...binanceSet].filter(pair => bybitSet.has(pair));

  console.log("Pares arbitrables entre Binance y Bybit con USDT:");
  arbitrable.sort().forEach(pair => console.log(pair));
}

main().catch(console.error);