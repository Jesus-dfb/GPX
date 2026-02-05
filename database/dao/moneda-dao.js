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
}

module.exports = MonedaDAO;
