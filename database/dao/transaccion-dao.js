class TransaccionDAO {
  #db;
  constructor(db) {
    this.#db = db;
  }

  create({ id, user_id, type, currency, amount, fee = 0, destination = null, meta = null, created_at = null }) {
    this.#db.prepare(`
      INSERT INTO transacciones (id, user_id, type, currency, amount, fee, destination, meta, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
    `).run(
      String(id),
      user_id,
      type,
      currency.toUpperCase(),
      Number(amount) || 0,
      Number(fee) || 0,
      destination,
      meta ? JSON.stringify(meta) : null,
      created_at
    );
  }

  listByUserId(userId, limit = 50) {
    return this.#db.prepare(`
      SELECT id, type, currency, amount, fee, destination, meta, created_at
      FROM transacciones
      WHERE user_id = ?
      ORDER BY datetime(created_at) DESC
      LIMIT ?
    `).all(userId, limit);
  }
}

module.exports = TransaccionDAO;
