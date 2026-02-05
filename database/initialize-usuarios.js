const fs = require("fs");
const path = require("path");

/**
 * Tabla: usuarios
 * Seed: migra data/users.json si existe y la tabla está vacía.
 */
module.exports = function initializeUsuarios(db) {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run();

  const total = db.prepare("SELECT COUNT(*) AS total FROM usuarios").get().total;
  if (total > 0) return;

  // Seed desde JSON (si existe)
  const usersPath = path.join(__dirname, "..", "data", "users.json");
  if (!fs.existsSync(usersPath)) return;

  let users = [];
  try {
    users = JSON.parse(fs.readFileSync(usersPath, "utf8"));
  } catch (e) {
    console.error("Error leyendo users.json para seed:", e);
    return;
  }

  const insert = db.prepare(
    "INSERT INTO usuarios (id, name, email, password) VALUES (?, ?, ?, ?)"
  );

  const tx = db.transaction((rows) => {
    for (const u of rows) {
      insert.run(u.id, u.name, u.email, u.password);
    }
  });

  try {
    tx(users);
  } catch (e) {
    console.error("Error haciendo seed de usuarios:", e);
  }
};
