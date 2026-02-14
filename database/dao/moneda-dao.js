class MonedaDAO {
  #db;
  constructor(db) {
    this.#db = db;
  }

  getAll() {
    return this.#db.prepare("SELECT * FROM monedas ORDER BY symbol").all();
  }

  getBySymbol(symbol) {
    return this.#db.prepare("SELECT * FROM monedas WHERE symbol = ?").get(symbol) || null;
  }

  updatePrice(symbol, priceEur, change24h) {
    this.#db.prepare(`
      UPDATE monedas 
      SET price_eur = ?, change_24h = ?, updated_at = datetime('now')
      WHERE symbol = ?
    `).run(priceEur, change24h, symbol);
  }

  updatePriceById(id, priceEur, change24h) {
    this.#db.prepare(`
      UPDATE monedas 
      SET price_eur = ?, change_24h = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(priceEur, change24h, id);
  }
}

module.exports = MonedaDAO;
