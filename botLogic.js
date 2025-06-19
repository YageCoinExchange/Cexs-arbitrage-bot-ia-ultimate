/*
  Lógica avanzada del bot:

  1. Para cada par/token:
      - Verifica si está habilitado y si la red está activa.
      - Solo opera si hay suficiente volumen (min_trade, max_trade).
      - Calcula el spread actual y compara con min_spread configurado.
      - Calcula el slippage estimado y compara con max_slippage.
      - Suma todos los fees (trading + retiro en ambos exchanges).
      - Solo ejecuta la operación si la ganancia neta (spread - fees - slippage) es positiva.
      - Si algún parámetro está fuera del rango recomendado, loguea advertencia.
      - Revisa cada 12h la configuración y el estado de cada token (puede ser con un cron que actualice el estado y muestre en frontend).
*/