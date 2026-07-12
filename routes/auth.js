const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { guestOnly, requireAuth } = require('../middleware/auth');

// Login page
router.get('/login', guestOnly, (req, res) => {
  res.render('auth/login', { title: 'Iniciar Sesión', error: null, layout: false });
});

// Login action
router.post('/login', guestOnly, (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('auth/login', { title: 'Iniciar Sesión', error: 'Completa todos los campos', layout: false });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.render('auth/login', { title: 'Iniciar Sesión', error: 'Email o contraseña incorrectos', layout: false });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.render('auth/login', { title: 'Iniciar Sesión', error: 'Email o contraseña incorrectos', layout: false });
  }

  req.session.userId = user.id;

  const store = db.prepare('SELECT id FROM stores WHERE user_id = ?').get(user.id);
  if (store) {
    req.session.storeId = store.id;
    return res.redirect('/dashboard');
  }

  res.redirect('/dashboard/setup');
});

// Register page
router.get('/register', guestOnly, (req, res) => {
  res.render('auth/register', { title: 'Crear Cuenta', error: null, layout: false });
});

// Register action
router.post('/register', guestOnly, (req, res) => {
  const { name, email, password, confirm_password } = req.body;

  if (!name || !email || !password) {
    return res.render('auth/register', { title: 'Crear Cuenta', error: 'Completa todos los campos', layout: false });
  }

  if (password.length < 6) {
    return res.render('auth/register', { title: 'Crear Cuenta', error: 'La contraseña debe tener al menos 6 caracteres', layout: false });
  }

  if (password !== confirm_password) {
    return res.render('auth/register', { title: 'Crear Cuenta', error: 'Las contraseñas no coinciden', layout: false });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.render('auth/register', { title: 'Crear Cuenta', error: 'Este email ya está registrado', layout: false });
  }

  const id = uuidv4();
  const hashedPassword = bcrypt.hashSync(password, 10);

  db.prepare('INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)').run(id, email, hashedPassword, name);

  req.session.userId = id;
  res.redirect('/dashboard/setup');
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
