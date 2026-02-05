// 1. CARGA DE VARIABLES DE ENTORNO
require('dotenv').config();

const express = require('express');
const router = express.Router();

// --- IMPORTACIONES ---
const Database = require('../database/database');
const MonedaDAO = require('../database/dao/moneda-dao');
const UsuarioDAO = require('../database/dao/usuario-dao');
const WalletDAO = require('../database/dao/wallet-dao');
const TransaccionDAO = require('../database/dao/transaccion-dao');

const db = Database.getInstance();
const monedaDao = new MonedaDAO(db);
const usuarioDao = new UsuarioDAO(db);
const walletDao = new WalletDAO(db);
const transaccionDao = new TransaccionDAO(db);

const {
  requireAuth
} = require('../middleware/auth');
const axios = require('axios');
const {
  GoogleGenerativeAI
} = require("@google/generative-ai");
// ---------------------


// --- DEBUG AL ARRANCAR ---
// Esto intentará listar tus modelos disponibles en la terminal
// Si falla, al menos sabremos que la conexión es buena.
console.log("---------------------------------------");
console.log("⚙️  Configurando IA...");
if (!process.env.GEMINI_API_KEY) {
  console.log("❌ ERROR: No veo la GEMINI_API_KEY");
} else {
  console.log("✅ API Key detectada.");
}
console.log("---------------------------------------");

/* GET home page. */
router.get('/', function (req, res, next) {
  try {
    const coins = monedaDao.getAll();
    res.render('index', {
      title: 'Galpe Exchange',
      coins: coins
    });
  } catch (error) {
    next(error);
  }
});

router.get('/support', function (req, res, next) {
  res.render('support', { title: 'Soporte - Galpe Exchange' });
});

router.get('/contact', function (req, res, next) {
  res.render('contact', { title: 'Soporte técnico - Galpe Exchange' });
});

router.post('/support/contact', function (req, res, next) {
  // Aquí puedes agregar la lógica para procesar el formulario
  // Por ahora, solo redirigimos de vuelta con un mensaje
  res.redirect('/contact?sent=true');
});

// Rutas protegidas - requieren autenticación
// Rutas protegidas - requieren autenticación
router.get('/dashboard', requireAuth, function (req, res, next) {
  try {
    const userId = req.session.user.id;

    const baseUser = usuarioDao.getById(userId);
    if (!baseUser) return res.redirect('/auth/logout');

    const coins = monedaDao.getAll();
    const wallets = walletDao.listByUserId(userId);

    const balance = { eur: 0, btc: 0 };
    const assetsRaw = [];

    for (const w of wallets) {
      const curr = String(w.currency).toUpperCase();
      const amt = Number(w.amount) || 0;
      if (curr === 'EUR') balance.eur = amt;
      if (curr === 'BTC') balance.btc = amt;
      if (curr !== 'EUR' && amt !== 0) assetsRaw.push({ symbol: curr, amount: amt });
    }

    const user = { ...baseUser, balance, assets: assetsRaw };
    req.session.user = user;

    // Map user assets to include coin details (like icon color)
    const userAssets = user.assets.map(asset => {
      const coin = coins.find(c => c.symbol === asset.symbol);
      return { ...asset, ...coin };
    });

    res.render('dashboard', {
      title: 'Panel - Galpe Exchange',
      user,
      assets: userAssets,
      coins
    });
  } catch (error) {
    next(error);
  }
});

router.get('/market', function (req, res, next) {
  try {
    const coins = monedaDao.getAll();
    // Sort for gainers/losers
    const sortedByChange = [...coins].sort((a, b) => b.change_24h - a.change_24h);
    const gainers = sortedByChange.slice(0, 4);
    const losers = sortedByChange.slice().reverse().slice(0, 4);

    res.render('market', {
      title: 'Mercado - Galpe Exchange',
      coins: coins,
      gainers: gainers,
      losers: losers
    });
  } catch (error) {
    next(error);
  }
});

// Trading page for specific coin
router.get('/trade/:symbol', requireAuth, function (req, res, next) {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const coins = monedaDao.getAll();
    const coin = coins.find(c => c.symbol === symbol);

    if (!coin) {
      return res.redirect('/market');
    }

    res.render('trade', {
      title: coin.name + ' - Trading',
      coin: coin,
      coins: coins, // Para el sidebar de pares
      user: req.session.user
    });
  } catch (error) {
    next(error);
  }
});

router.get('/deposit', requireAuth, (req, res) => {
  res.render('deposit', {
    title: 'Depositar - Galpe Exchange',
    user: req.session.user,
    error: null,
    success: null
  });
});

router.post('/deposit', requireAuth, (req, res, next) => {
  try {
    const { amount, currency } = req.body;

    const curr = (currency || 'eur').toUpperCase();
    const parsedAmount = Number.parseFloat(String(amount).replace(',', '.'));

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.render('deposit', {
        title: 'Depositar - Galpe Exchange',
        user: req.session.user,
        error: 'Introduce una cantidad válida (mayor que 0).',
        success: null
      });
    }

    const allowed = new Set(['EUR', 'BTC']);
    if (!allowed.has(curr)) {
      return res.render('deposit', {
        title: 'Depositar - Galpe Exchange',
        user: req.session.user,
        error: 'Moneda no soportada.',
        success: null
      });
    }

    const userId = req.session.user.id;
    walletDao.add(userId, curr, parsedAmount);

    transaccionDao.create({
      id: Date.now().toString(),
      user_id: userId,
      type: 'deposit',
      currency: curr,
      amount: parsedAmount,
      fee: 0,
      meta: { source: 'web' },
      created_at: new Date().toISOString()
    });

    // refrescar sesión
    const refreshed = usuarioDao.getById(userId);
    const wallets = walletDao.listByUserId(userId);
    const balance = { eur: 0, btc: 0 };
    const assets = [];
    for (const w of wallets) {
      const c = String(w.currency).toUpperCase();
      const a = Number(w.amount) || 0;
      if (c === 'EUR') balance.eur = a;
      if (c === 'BTC') balance.btc = a;
      if (c !== 'EUR' && a !== 0) assets.push({ symbol: c, amount: a });
    }
    req.session.user = { ...refreshed, balance, assets };

    return res.render('deposit', {
      title: 'Depositar - Galpe Exchange',
      user: req.session.user,
      error: null,
      success: `Depósito: +${parsedAmount} ${curr}`
    });
  } catch (err) {
    next(err);
  }
});

// Rutas públicas de autenticación
router.get('/login', function (req, res, next) {
  // Si ya está autenticado, redirigir al dashboard
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('login', { title: 'Iniciar Sesión - Galpe Exchange' });
});

router.get('/register', function (req, res, next) {
  // Si ya está autenticado, redirigir al dashboard
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('register', { title: 'Registrarse - Galpe Exchange' });
});


//   WITHDRAW (GET)
//   WITHDRAW (GET)
router.get('/withdraw', requireAuth, (req, res, next) => {
  try {
    const history = transaccionDao
      .listByUserId(req.session.user.id, 50)
      .filter(t => t.type === 'withdraw')
      .map(t => ({
        id: t.id,
        type: 'withdraw',
        currency: t.currency.toLowerCase(),
        amount: t.amount,
        fee: t.fee,
        destination: t.destination,
        status: (() => {
          try { return JSON.parse(t.meta || '{}').status || 'completed'; } catch { return 'completed'; }
        })(),
        createdAt: t.created_at
      }));

    res.render('withdraw', {
      title: 'Retirar - Galpe Exchange',
      user: req.session.user,
      error: null,
      success: null,
      history
    });
  } catch (err) {
    next(err);
  }
});

//   WITHDRAW (POST) - SIMULADO
//   WITHDRAW (POST) - SIMULADO
router.post('/withdraw', requireAuth, (req, res, next) => {
  try {
    const { amount, currency, destination } = req.body;

    const curr = (currency || 'eur').toUpperCase();
    const parsedAmount = Number.parseFloat(String(amount).replace(',', '.'));
    const dest = (destination || '').trim();

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.render('withdraw', {
        title: 'Retirar - Galpe Exchange',
        user: req.session.user,
        error: 'Introduce una cantidad válida.',
        success: null,
        history: []
      });
    }

    if (!['EUR', 'BTC'].includes(curr)) {
      return res.render('withdraw', {
        title: 'Retirar - Galpe Exchange',
        user: req.session.user,
        error: 'Moneda no soportada.',
        success: null,
        history: []
      });
    }

    if (dest.length < 6) {
      return res.render('withdraw', {
        title: 'Retirar - Galpe Exchange',
        user: req.session.user,
        error: 'Introduce un destino válido (IBAN o wallet).',
        success: null,
        history: []
      });
    }

    const userId = req.session.user.id;

    const current = walletDao.getAmount(userId, curr);

    if (parsedAmount > current) {
      return res.render('withdraw', {
        title: 'Retirar - Galpe Exchange',
        user: req.session.user,
        error: `Fondos insuficientes. Tienes ${curr === 'BTC' ? current : current.toFixed(2)} ${curr}.`,
        success: null,
        history: []
      });
    }

    const fee = curr === 'BTC' ? 0.0001 : 0.50;
    const totalDebit = parsedAmount + fee;

    if (totalDebit > current) {
      return res.render('withdraw', {
        title: 'Retirar - Galpe Exchange',
        user: req.session.user,
        error: `Saldo insuficiente para cubrir comisión. Comisión: ${fee} ${curr}.`,
        success: null,
        history: []
      });
    }

    walletDao.subtract(userId, curr, totalDebit);

    const txId = Date.now().toString();
    transaccionDao.create({
      id: txId,
      user_id: userId,
      type: 'withdraw',
      currency: curr,
      amount: parsedAmount,
      fee,
      destination: dest,
      meta: { status: 'completed' },
      created_at: new Date().toISOString()
    });

    // refrescar sesión
    const refreshed = usuarioDao.getById(userId);
    const wallets = walletDao.listByUserId(userId);
    const balance = { eur: 0, btc: 0 };
    const assets = [];
    for (const w of wallets) {
      const c = String(w.currency).toUpperCase();
      const a = Number(w.amount) || 0;
      if (c === 'EUR') balance.eur = a;
      if (c === 'BTC') balance.btc = a;
      if (c !== 'EUR' && a !== 0) assets.push({ symbol: c, amount: a });
    }
    req.session.user = { ...refreshed, balance, assets };

    const history = transaccionDao
      .listByUserId(userId, 50)
      .filter(t => t.type === 'withdraw')
      .map(t => ({
        id: t.id,
        type: 'withdraw',
        currency: t.currency.toLowerCase(),
        amount: t.amount,
        fee: t.fee,
        destination: t.destination,
        status: (() => {
          try { return JSON.parse(t.meta || '{}').status || 'completed'; } catch { return 'completed'; }
        })(),
        createdAt: t.created_at
      }));

    return res.render('withdraw', {
      title: 'Retirar - Galpe Exchange',
      user: req.session.user,
      error: null,
      success: `Retiro simulado: -${parsedAmount} ${curr} (comisión ${fee} ${curr}).`,
      history
    });
  } catch (err) {
    next(err);
  }
});

router.get('/support/reset-password', function (req, res, next) {
  res.render('reset-password', { title: 'Cambiar contraseña - Galpe Exchange' });
});

router.get('/support/change-email', function (req, res, next) {
  res.render('change-email', { title: 'Cambiar correo electrónico - Galpe Exchange' });
});

router.post('/support/change-email', function (req, res, next) {
  try {
    const { currentEmail, newEmail, password } = req.body;

    if (!currentEmail || !newEmail || !password) {
      return res.render('change-email', {
        title: 'Cambiar correo electrónico - Galpe Exchange',
        error: 'Por favor, completa todos los campos'
      });
    }

    if (!newEmail.includes('@')) {
      return res.render('change-email', {
        title: 'Cambiar correo electrónico - Galpe Exchange',
        error: 'Por favor, introduce un email válido'
      });
    }

    if (currentEmail === newEmail) {
      return res.render('change-email', {
        title: 'Cambiar correo electrónico - Galpe Exchange',
        error: 'El nuevo correo electrónico debe ser diferente al actual'
      });
    }

    const userWithPwd = usuarioDao.getWithPasswordByEmail(currentEmail);
    if (!userWithPwd) {
      return res.render('change-email', {
        title: 'Cambiar correo electrónico - Galpe Exchange',
        error: 'No se encontró ningún usuario con ese correo electrónico'
      });
    }

    if (userWithPwd.password !== password) {
      return res.render('change-email', {
        title: 'Cambiar correo electrónico - Galpe Exchange',
        error: 'La contraseña es incorrecta'
      });
    }

    const emailExists = usuarioDao.getByEmail(newEmail);
    if (emailExists && emailExists.id !== userWithPwd.id) {
      return res.render('change-email', {
        title: 'Cambiar correo electrónico - Galpe Exchange',
        error: 'Este correo electrónico ya está en uso por otra cuenta'
      });
    }

    usuarioDao.updateEmail(userWithPwd.id, newEmail);

    // Si el usuario está en sesión, actualizar la sesión también
    if (req.session.user && req.session.user.id === userWithPwd.id) {
      req.session.user.email = newEmail;
    }

    res.render('change-email', {
      title: 'Cambiar correo electrónico - Galpe Exchange',
      success: 'Correo electrónico cambiado exitosamente. Ya puedes iniciar sesión con tu nuevo correo electrónico.'
    });
  } catch (error) {
    console.error('Error al cambiar correo electrónico:', error);
    res.render('change-email', {
      title: 'Cambiar correo electrónico - Galpe Exchange',
      error: 'Ocurrió un error al cambiar el correo electrónico. Por favor, intenta de nuevo.'
    });
  }
});

router.post('/support/reset-password', function (req, res, next) {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    if (!email || !newPassword || !confirmPassword) {
      return res.render('reset-password', {
        title: 'Cambiar contraseña - Galpe Exchange',
        error: 'Por favor, completa todos los campos'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.render('reset-password', {
        title: 'Cambiar contraseña - Galpe Exchange',
        error: 'Las contraseñas no coinciden'
      });
    }

    if (newPassword.length < 6) {
      return res.render('reset-password', {
        title: 'Cambiar contraseña - Galpe Exchange',
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    const user = usuarioDao.getByEmail(email);
    if (!user) {
      return res.render('reset-password', {
        title: 'Cambiar contraseña - Galpe Exchange',
        error: 'No se encontró ningún usuario con ese correo electrónico'
      });
    }

    usuarioDao.updatePasswordByEmail(email, newPassword);

    if (req.session.user && req.session.user.email === email) {
      req.session.user = { ...req.session.user };
    }

    res.render('reset-password', {
      title: 'Cambiar contraseña - Galpe Exchange',
      success: 'Contraseña cambiada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.'
    });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.render('reset-password', {
      title: 'Cambiar contraseña - Galpe Exchange',
      error: 'Ocurrió un error al cambiar la contraseña. Por favor, intenta de nuevo.'
    });
  }
});

// --- RUTA IA (VERSIÓN BLINDADA / SMART FALLBACK) ---
router.get('/api/ai-analysis', async (req, res) => {
  let noticiasRaw = ""; // Guardamos las noticias aquí para usarlas si falla la IA

  try {
    console.log("1. Buscando noticias en CryptoCompare...");

    // Paso 1: Obtener noticias reales (Esto casi nunca falla)
    const newsResponse = await axios.get('https://min-api.cryptocompare.com/data/v2/news/?lang=ES');

    // Preparamos los titulares para la IA y para el "Plan B"
    const headlines = newsResponse.data.Data.slice(0, 3);
    noticiasRaw = headlines.map(n => `- ${n.title}`).join('\\n');

    console.log("2. Noticias obtenidas. Contactando a Google Gemini...");

    // Verificamos API Key
    if (!process.env.GEMINI_API_KEY) throw new Error("Falta API Key");

    // Paso 2: Intentar con la IA
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Intentamos usar el modelo flash, si falla saltaremos al catch
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const prompt = `
      Actúa como un experto trader. Lee estos titulares:
      ${noticiasRaw}
      
      Escribe un resumen muy corto (máximo 40 palabras) y emotivo para un inversor. 
      Usa emojis. No uses negritas (**), usa etiquetas HTML <b> si quieres resaltar algo.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // ¡ÉXITO! La IA respondió
    res.json({
      success: true,
      analysis: text
    });

  } catch (error) {
    console.error("⚠️ MODO RESPALDO ACTIVADO:", error.message);

    if (noticiasRaw) {
      // MAQUILLAJE: Hacemos parecer que este es el análisis normal
      res.json({
        success: true,
        analysis: `<strong>📡 ACTUALIZACIÓN DE MERCADO:</strong><br><br>He seleccionado los titulares más importantes del momento para ti:<br><br>${noticiasRaw.replace(/\\n/g, '<br><br>')}<br><br>💡 <em>Conclusión: El mercado muestra actividad alta. Recomiendo revisar los gráficos antes de operar.</em>`
      });
    } else {
      res.json({
        success: true,
        analysis: "⚠️ Conectando con los mercados... Por favor, inténtalo en unos segundos."
      });
    }
  }
});

module.exports = router;
