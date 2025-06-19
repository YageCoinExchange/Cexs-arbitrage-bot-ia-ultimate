const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const configPath = path.join(__dirname, '..', 'config.js');

// GET config (ya lo tienes)
router.get('/config', (req, res) => {
  // Si usas module.exports = { ... }, haz require dinámico
  delete require.cache[require.resolve(configPath)];
  const config = require(configPath);
  res.json(config);
});

// PUT config (GUARDAR)
router.put('/config', express.json(), (req, res) => {
  const newConfig = req.body;
  // OJO: Sobreescribe config.js. Haz backup antes de producción.
  const fileContents = "module.exports = " + JSON.stringify(newConfig, null, 2);
  fs.writeFile(configPath, fileContents, (err) => {
    if (err) {
      console.error("Error guardando config.js:", err);
      return res.status(500).json({ error: "Error guardando configuración." });
    }
    res.json({ ok: true });
  });
});

module.exports = router;