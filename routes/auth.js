const express = require('express');
const router = express.Router();

const Database = require('../database/database');
const UsuarioDAO = require('../database/dao/usuario-dao');
const WalletDAO = require('../database/dao/wallet-dao');

const db = Database.getInstance();
const usuarioDao = new UsuarioDAO(db);
const walletDao = new WalletDAO(db);

function buildSessionUser(userId) {
  const user = usuarioDao.getById(userId);
  if (!user) return null;

  const wallets = walletDao.listByUserId(userId);

  // Mantener compatibilidad con vistas existentes
  const balance = { eur: 0, btc: 0 };
  const assets = [];

  for (const w of wallets) {
    const curr = String(w.currency || '').toUpperCase();
    const amt = Number(w.amount) || 0;

    if (curr === 'EUR') balance.eur = amt;
    else if (curr === 'BTC') balance.btc = amt;

    // Consideramos "assets" todo lo que no sea EUR
    if (curr !== 'EUR' && amt !== 0) {
      assets.push({ symbol: curr, amount: amt });
    }
  }

  return { ...user, balance, assets };
}

// POST login - Autenticar usuario
router.post('/login', function (req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('login', {
        title: 'Iniciar Sesión - Galpe Exchange',
        error: 'Por favor, completa todos los campos'
      });
    }

    const user = usuarioDao.authenticate(email, password);
    if (!user) {
      return res.render('login', {
        title: 'Iniciar Sesión - Galpe Exchange',
        error: 'Correo electrónico o contraseña incorrectos'
      });
    }

    req.session.user = buildSessionUser(user.id);
    return res.redirect('/dashboard');
  } catch (error) {
    console.error('Error en login:', error);
    next(error);
  }
});

// POST register - Registrar nuevo usuario
router.post('/register', function (req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.render('register', {
        title: 'Registrarse - Galpe Exchange',
        error: 'Todos los campos son obligatorios'
      });
    }

    if (!email.includes('@')) {
      return res.render('register', {
        title: 'Registrarse - Galpe Exchange',
        error: 'Por favor, introduce un email válido'
      });
    }

    const existingUser = usuarioDao.getByEmail(email);
    if (existingUser) {
      return res.render('register', {
        title: 'Registrarse - Galpe Exchange',
        error: 'Este correo electrónico ya está registrado'
      });
    }

    const created = usuarioDao.create({ name, email, password });

    // Crear wallets base
    walletDao.upsert(created.id, 'EUR', 0);
    walletDao.upsert(created.id, 'BTC', 0);

    req.session.user = buildSessionUser(created.id);
    return res.redirect('/dashboard');
  } catch (error) {
    console.error('Error en registro:', error);
    next(error);
  }
});

// GET logout - Cerrar sesión
router.get('/logout', function (req, res, next) {
  req.session.destroy((err) => {
    if (err) console.error('Error al cerrar sesión:', err);
    res.redirect('/');
  });
});

module.exports = router;
