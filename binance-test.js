const { Spot } = require('@binance/connector');

const apiKey = 'qQ9F6OyRjH7uzeiThURx722WLB5LD080DS7JDG4QpAPYZLeTGjgnn1vucNqcwmm0';
const apiSecret = 'PP0l9KKVa30To898958itxWPU99auRIWxzpcrgptZ1NXURENvb8f0nCaY8JI0qQx';

const client = new Spot(apiKey, apiSecret);

async function test() {
  try {
    const resp = await client.tickerPrice();
    console.log("RESULTADO DE BINANCE:", resp.data);
    if (Array.isArray(resp.data)) {
      console.log("Primer elemento:", resp.data[0]);
    } else {
      console.log("NO ES UN ARRAY:", resp.data);
    }
  } catch (err) {
    console.error("ERROR:", err);
  }
}

test();