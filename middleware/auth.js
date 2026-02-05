// Middleware para proteger rutas que requieren autenticación
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
}

// Middleware para redirigir usuarios autenticados (para páginas de login/register)
function requireGuest(req, res, next) {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    next();
}

module.exports = {
    requireAuth,
    requireGuest
};
