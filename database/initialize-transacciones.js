const fs = require("fs");
const path = require("path");

/**
 * Tabla: transacciones
 * Seed: migra withdrawHistory de data/users.json si existe y la tabla está vacía.
 */
module.exports = function initializeTransacciones(db) {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS transacciones (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('deposit','withdraw','trade_buy','trade_sell')),
      currency TEXT NOT NULL,
      amount REAL NOT NULL,
      fee REAL NOT NULL DEFAULT 0,
      destination TEXT,
      meta TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
  `).run();

  const total = db.prepare("SELECT COUNT(*) AS total FROM transacciones").get().total;
  if (total > 0) return;

  const usersPath = path.join(__dirname, "..", "data", "users.json");
  if (!fs.existsSync(usersPath)) return;

  let users = [];
  try {
    users = JSON.parse(fs.readFileSync(usersPath, "utf8"));
  } catch (e) {
    console.error("Error leyendo users.json para seed transacciones:", e);
    return;
  }

  const insert = db.prepare(`
    INSERT INTO transacciones (id, user_id, type, currency, amount, fee, destination, meta, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction((rows) => {
    for (const u of rows) {
      const history = Array.isArray(u.withdrawHistory) ? u.withdrawHistory : [];
      for (const h of history) {
        insert.run(
          String(h.id),
          u.id,
          "withdraw",
          String(h.currency || "").toUpperCase(),
          Number(h.amount) || 0,
          Number(h.fee) || 0,
          h.destination ? String(h.destination) : null,
          JSON.stringify({ status: h.status || null }),
          h.createdAt ? String(h.createdAt) : new Date().toISOString()
        );
      }
    }
  });

  try {
    tx(users);
  } catch (e) {
    console.error("Error haciendo seed de transacciones:", e);
  }
};
