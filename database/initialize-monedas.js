const fs = require("fs");
const path = require("path");

/**
 * Tabla: monedas
 * Seed: migra data/coins.json si existe y la tabla está vacía.
 */
module.exports = function initializeMonedas(db) {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS monedas (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      price_eur REAL,
      change_24h REAL,
      icon_color TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run();

  const total = db.prepare("SELECT COUNT(*) AS total FROM monedas").get().total;
  if (total > 0) return;

  const coinsPath = path.join(__dirname, "..", "data", "coins.json");
  if (!fs.existsSync(coinsPath)) return;

  let coins = [];
  try {
    coins = JSON.parse(fs.readFileSync(coinsPath, "utf8"));
  } catch (e) {
    console.error("Error leyendo coins.json para seed:", e);
    return;
  }

  const insert = db.prepare(`
    INSERT INTO monedas (id, symbol, name, price_eur, change_24h, icon_color)
    VALUES (@id, @symbol, @name, @price_eur, @change_24h, @icon_color)
  `);

  const tx = db.transaction((rows) => {
    for (const c of rows) insert.run(c);
  });

  try {
    tx(coins);
  } catch (e) {
    console.error("Error haciendo seed de monedas:", e);
  }
};
