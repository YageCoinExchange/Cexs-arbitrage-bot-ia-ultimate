async function isOpportunityProfitable(pair, amount, prices, config) {
  // 1. Revisa volumen real
  const volume = await getPairVolume(pair);
  if (volume < amount * 10) return false; // Solo arbitra si hay volumen suficiente
  
  // 2. Obtiene parámetros específicos del par o toma globales
  const parRisk = config.PAIR_RISK[pair] || config.GLOBAL_RISK;
  const feeA = config.FEES_AND_LIMITS.BINANCE[pair.split('/')[0]].withdrawal.fee;
  const feeB = config.FEES_AND_LIMITS.BYBIT[pair.split('/')[0]].withdrawal.fee;
  const spread = (prices.BYBIT - prices.BINANCE) / prices.BINANCE;
  
  // 3. Calcula la ganancia neta real (spread - fees - slippage)
  const cost = feeA + feeB + (parRisk.maxSlippage * 2) + config.TRADING_FEES.BINANCE + config.TRADING_FEES.BYBIT;
  if (spread < parRisk.minSpread + cost) return false;
  
  // 4. Revisa si la red/token está activa (llama a la API del exchange cada 12h)
  if (!await isTokenActive(pair.split('/')[0], "BINANCE") || !await isTokenActive(pair.split('/')[0], "BYBIT")) {
    return false;
  }
  // 5. Si todo OK, la oportunidad es válida
  return true;
}