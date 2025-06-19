async function getPairVolume(pair, exchange) {
  let url;
  let symbol;

  // Formato de símbolo según exchange
  if (exchange === "BINANCE") {
    symbol = pair.replace("/", "");
    url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`;
  } else if (exchange === "BYBIT") {
    // Bybit usa guión bajo y mayúsculas para spot, y símbolo especial para derivados
    symbol = pair.replace("/", "");
    // API spot Bybit (https://api.bybit.com/v5/market/tickers?category=spot&symbol=BTCUSDT)
    url = `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`;
  } else {
    throw new Error("Exchange no soportado");
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error consultando ${exchange}: ${res.statusText}`);
  const data = await res.json();

  if (exchange === "BINANCE") {
    return parseFloat(data.quoteVolume); // en USDT
  }

  if (exchange === "BYBIT") {
    // Bybit responde en: data.result.list[0].quoteVolume
    if (
      data &&
      data.result &&
      Array.isArray(data.result.list) &&
      data.result.list.length > 0
    ) {
      return parseFloat(data.result.list[0].quoteVolume);
    } else {
      throw new Error("No se pudo obtener el volumen para " + pair + " en Bybit");
    }
  }
}

// Ejemplo de uso:
// const volBinance = await getPairVolume("BTC/USDT", "BINANCE");
// const volBybit = await getPairVolume("BTC/USDT", "BYBIT");