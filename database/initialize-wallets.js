const fs = require("fs");
const path = require("path");

/**
 * Tabla: wallets (balances por usuario y moneda/símbolo)
 * Seed: migra balances y assets desde data/users.json si existe y la tabla está vacía.
 */
module.exports = function initializeWallets(db) {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS wallets (
      user_id INTEGER NOT NULL,
      currency TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, currency),
      FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
  `).run();

  const total = db.prepare("SELECT COUNT(*) AS total FROM wallets").get().total;
  if (total > 0) return;

  const usersPath = path.join(__dirname, "..", "data", "users.json");
  if (!fs.existsSync(usersPath)) return;

  let users = [];
  try {
    users = JSON.parse(fs.readFileSync(usersPath, "utf8"));
  } catch (e) {
    console.error("Error leyendo users.json para seed wallets:", e);
    return;
  }

  const upsert = db.prepare(`
    INSERT INTO wallets (user_id, currency, amount)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, currency) DO UPDATE SET
      amount=excluded.amount,
      updated_at=datetime('now')
  `);

  const tx = db.transaction((rows) => {
    for (const u of rows) {
      // balance fiat/crypto clásico
      const bal = u.balance || {};
      for (const [k, v] of Object.entries(bal)) {
        upsert.run(u.id, k.toUpperCase(), Number(v) || 0);
      }

      // assets (BTC/ETH/...): si ya existe, suma para no pisar
      if (Array.isArray(u.assets)) {
        for (const a of u.assets) {
          const curr = String(a.symbol || "").toUpperCase();
          if (!curr) continue;
          const existing = db.prepare(
            "SELECT amount FROM wallets WHERE user_id=? AND currency=?"
          ).get(u.id, curr);
          const newAmount = (existing?.amount || 0) + (Number(a.amount) || 0);
          upsert.run(u.id, curr, newAmount);
        }
      }
    }
  });

  try {
    tx(users);
  } catch (e) {
    console.error("Error haciendo seed de wallets:", e);
  }
};
