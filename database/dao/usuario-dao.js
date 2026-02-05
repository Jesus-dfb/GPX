class UsuarioDAO {
  #db;

  constructor(db) {
    this.#db = db;
  }

  getById(id) {
    return this.#db.prepare(
      "SELECT id, name, email, created_at FROM usuarios WHERE id = ?"
    ).get(id) || null;
  }

  getWithPasswordByEmail(email) {
    return this.#db.prepare(
      "SELECT * FROM usuarios WHERE email = ?"
    ).get(email) || null;
  }

  getByEmail(email) {
    return this.#db.prepare(
      "SELECT id, name, email, created_at FROM usuarios WHERE email = ?"
    ).get(email) || null;
  }

  authenticate(email, password) {
    // Nota: en producción deberías usar bcrypt.
    return this.#db.prepare(
      "SELECT id, name, email, created_at FROM usuarios WHERE email = ? AND password = ?"
    ).get(email, password) || null;
  }

  updateEmail(userId, newEmail) {
    this.#db.prepare("UPDATE usuarios SET email = ? WHERE id = ?").run(newEmail, userId);
    return this.getById(userId);
  }

  updatePasswordByEmail(email, newPassword) {
    this.#db.prepare("UPDATE usuarios SET password = ? WHERE email = ?").run(newPassword, email);
    return this.getByEmail(email);
  }

  create({ name, email, password }) {
    const stmt = this.#db.prepare(
      "INSERT INTO usuarios (name, email, password) VALUES (?, ?, ?)"
    );
    const info = stmt.run(name, email, password);
    return this.getById(info.lastInsertRowid);
  }
}

module.exports = UsuarioDAO;
