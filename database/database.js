const path = require("path");
const BetterSqlite3 = require("better-sqlite3");

class Database {
  static #db = null;

  constructor() {
    throw new Error("Use Database.getInstance(dbPath) instead of new Database().");
  }

  /**
   * @param {string} [dbPath] Absolute/relative path to sqlite file on first call.
   */
  static getInstance(dbPath) {
    if (Database.#db === null) {
      if (!dbPath) {
        throw new Error("Database not initialized. Call Database.getInstance(dbPath) once at app start.");
      }

      // Ensure the directory exists (sqlite creates the file, not the folder)
      const dir = path.dirname(dbPath);
      require("fs").mkdirSync(dir, { recursive: true });

      Database.#db = new BetterSqlite3(dbPath);
      Database.#db.pragma("foreign_keys = ON");

      // Initialize schema + seed data
      require("./initialize-usuarios")(Database.#db);
      require("./initialize-monedas")(Database.#db);
      require("./initialize-wallets")(Database.#db);
      require("./initialize-transacciones")(Database.#db);
      require("./initialize-price-history")(Database.#db);
    }

    return Database.#db;
  }
}

module.exports = Database;
