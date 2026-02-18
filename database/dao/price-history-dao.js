class PriceHistoryDAO {
  #db;
  constructor(db) {
    this.#db = db;
  }

  /**
   * Inserta un punto de histórico
   * @param {string} symbol
   * @param {number} priceEur
   */
  insert(symbol, priceEur) {
    this.#db.prepare(`
      INSERT INTO price_history (symbol, price_eur)
      VALUES (?, ?)
    `).run(symbol.toUpperCase(), priceEur);
  }

  /**
   * Obtiene los últimos N puntos de un símbolo ordenados por fecha ascendente
   * @param {string} symbol
   * @param {number} limit
   * @returns {Array<{symbol: string, price_eur: number, created_at: string}>}
   */
  getLastPoints(symbol, limit = 100) {
    return this.#db.prepare(`
      SELECT symbol, price_eur, created_at
      FROM price_history
      WHERE symbol = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(symbol.toUpperCase(), limit).reverse();
  }

  /**
   * Obtiene puntos desde una fecha/hora dada (ISO) con un límite máximo
   * @param {string} symbol
   * @param {string} sinceIso fecha ISO mínima (incluida)
   * @param {number} limit
   */
  getPointsSince(symbol, sinceIso, limit = 500) {
    return this.#db.prepare(`
      SELECT symbol, price_eur, created_at
      FROM price_history
      WHERE symbol = ? AND created_at >= ?
      ORDER BY created_at ASC
      LIMIT ?
    `).all(symbol.toUpperCase(), sinceIso, limit);
  }
}

module.exports = PriceHistoryDAO;

