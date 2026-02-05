class WalletDAO {
  #db;
  constructor(db) {
    this.#db = db;
  }

  listByUserId(userId) {
    return this.#db.prepare(
      "SELECT currency, amount FROM wallets WHERE user_id = ? ORDER BY currency"
    ).all(userId);
  }

  getAmount(userId, currency) {
    const row = this.#db.prepare(
      "SELECT amount FROM wallets WHERE user_id = ? AND currency = ?"
    ).get(userId, currency.toUpperCase());
    return row ? Number(row.amount) : 0;
  }

  upsert(userId, currency, amount) {
    this.#db.prepare(`
      INSERT INTO wallets (user_id, currency, amount)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, currency) DO UPDATE SET
        amount=excluded.amount,
        updated_at=datetime('now')
    `).run(userId, currency.toUpperCase(), Number(amount) || 0);
  }

  add(userId, currency, delta) {
    const curr = currency.toUpperCase();
    const current = this.getAmount(userId, curr);
    const next = current + (Number(delta) || 0);
    this.upsert(userId, curr, next);
    return next;
  }

  subtract(userId, currency, delta) {
    const curr = currency.toUpperCase();
    const current = this.getAmount(userId, curr);
    const next = current - (Number(delta) || 0);
    if (next < 0) throw new Error("Insufficient funds");
    this.upsert(userId, curr, next);
    return next;
  }
}

module.exports = WalletDAO;
