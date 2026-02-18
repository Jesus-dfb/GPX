/**
 * Tabla: price_history
 * Guarda histórico sencillo de precios por símbolo para gráficas.
 */
module.exports = function initializePriceHistory(db) {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      price_eur REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run();

  // Índice para consultas rápidas por símbolo y fecha
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_price_history_symbol_created
    ON price_history (symbol, created_at)
  `).run();
};

