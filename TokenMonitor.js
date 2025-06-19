const checkedTokens = {}; // token: timestamp último chequeo

async function checkTokenStatus(token, exchange) {
  const now = Date.now();
  if (checkedTokens[token + exchange] && now - checkedTokens[token + exchange] < 12 * 3600 * 1000) {
    return; // Ya fue chequeado en las últimas 12 horas
  }
  // Llama a la API del exchange y revisa si el token/red está activo
  // Si no está activo: márcalo como inactivo en la config temporal
  checkedTokens[token + exchange] = now;
}