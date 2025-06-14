const { RestClientV5 } = require('bybit-api');

const bybit = new RestClientV5({
  // Puedes dejar vacío para spot público
  // key: 'TU_API_KEY',
  // secret: 'TU_API_SECRET',
});

async function main() {
  try {
    // Pide TODOS los tickers spot
    const res = await bybit.getTickers({ category: "spot" });
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("ERROR:", err);
  }
}

main();