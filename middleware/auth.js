function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  res.redirect('/auth/login');
}

function requireStoreAuth(req, res, next) {
  if (req.session && req.session.userId && req.session.storeId) {
    return next();
  }
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard/setup');
  }
  res.redirect('/auth/login');
}

function guestOnly(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  next();
}

module.exports = { requireAuth, requireStoreAuth, guestOnly };
