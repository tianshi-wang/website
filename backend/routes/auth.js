const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, alias, age_verified } = req.body;

    // Alias and password are required
    if (!alias || !password) {
      return res.status(400).json({ error: 'Alias and password are required' });
    }

    // Age verification is required
    if (!age_verified) {
      return res.status(400).json({ error: 'You must confirm you are 18 years or older' });
    }

    // Validate alias
    if (alias.length < 2 || alias.length > 30) {
      return res.status(400).json({ error: 'Alias must be between 2 and 30 characters' });
    }

    // Check if alias already exists
    const existingAlias = db.prepare('SELECT id FROM users WHERE alias = ?').get(alias);
    if (existingAlias) {
      return res.status(400).json({ error: 'Alias already taken' });
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      // Check if email already exists
      const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already registered' });
      }
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Hash password and create user
    // Generate a unique placeholder email if none provided (database requires non-null)
    const userEmail = email || `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}@noemail.local`;
    const hash = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO users (email, password_hash, alias, age_verified) VALUES (?, ?, ?, ?)')
      .run(userEmail, hash, alias, 1);

    const user = db.prepare('SELECT id, email, alias, is_admin, created_at FROM users WHERE id = ?')
      .get(result.lastInsertRowid);

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, alias: user.alias, is_admin: user.is_admin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, alias, password } = req.body;

    if ((!email && !alias) || !password) {
      return res.status(400).json({ error: 'Email or alias and password are required' });
    }

    // Find user by email or alias
    let user;
    if (email) {
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    } else {
      user = db.prepare('SELECT * FROM users WHERE alias = ?').get(alias);
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, alias: user.alias, is_admin: user.is_admin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        alias: user.alias,
        is_admin: user.is_admin,
        created_at: user.created_at
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, email, alias, is_admin, created_at FROM users WHERE id = ?')
    .get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user });
});

module.exports = router;
