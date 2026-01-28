const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { validateRegister, validateLogin } = require('../middleware/validation');
const {
  hashPassword,
  comparePassword,
  generateToken,
  handleFailedLogin,
  resetFailedLoginAttempts,
  isAccountLocked
} = require('../utils/auth');

// Register new user
router.post('/register', validateRegister, async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'student' } = req.body;

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, role, created_at`,
      [email, passwordHash, firstName, lastName, role]
    );

    const user = result.rows[0];

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Provide more specific error messages for SQLite
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Generic server error
    res.status(500).json({ 
      error: error.message || 'Server error during registration',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Login user
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if account is locked
    const lockStatus = await isAccountLocked(email);
    if (lockStatus.locked) {
      return res.status(403).json({
        error: 'Account is locked due to multiple failed login attempts',
        lockedUntil: lockStatus.lockedUntil
      });
    }

    // Get user
    const result = await pool.query(
      'SELECT id, email, password_hash, first_name, last_name, role FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      await handleFailedLogin(email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Verify password
    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      const lockResult = await handleFailedLogin(email);
      if (lockResult.locked) {
        return res.status(403).json({
          error: 'Account locked due to multiple failed login attempts',
          lockedUntil: lockResult.lockedUntil
        });
      }
      return res.status(401).json({
        error: 'Invalid email or password',
        attemptsRemaining: lockResult.attemptsRemaining
      });
    }

    // Reset failed login attempts
    await resetFailedLoginAttempts(user.id);

    // Generate token
    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      `SELECT id, email, first_name, last_name, role, bio, profile_image_url, created_at
       FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      bio: user.bio,
      profileImageUrl: user.profile_image_url,
      createdAt: user.created_at
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
