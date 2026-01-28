const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Hash password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Compare password
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Handle account lockout
const handleFailedLogin = async (email) => {
  const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
  const lockoutTime = process.env.LOCKOUT_TIME || '30m';
  
  const result = await pool.query(
    'SELECT id, failed_login_attempts, account_locked_until FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    return { locked: false };
  }

  const user = result.rows[0];
  const newAttempts = (user.failed_login_attempts || 0) + 1;

  // Calculate lockout time (30 minutes from now)
  const lockoutMinutes = parseInt(lockoutTime) || 30;
  const lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);

  if (newAttempts >= maxAttempts) {
    await pool.query(
      'UPDATE users SET failed_login_attempts = $1, account_locked_until = $2 WHERE id = $3',
      [newAttempts, lockedUntil, user.id]
    );
    return { locked: true, lockedUntil };
  } else {
    await pool.query(
      'UPDATE users SET failed_login_attempts = $1 WHERE id = $2',
      [newAttempts, user.id]
    );
    return { locked: false, attemptsRemaining: maxAttempts - newAttempts };
  }
};

// Reset failed login attempts on successful login
const resetFailedLoginAttempts = async (userId) => {
  await pool.query(
    'UPDATE users SET failed_login_attempts = 0, account_locked_until = NULL WHERE id = $1',
    [userId]
  );
};

// Check if account is locked
const isAccountLocked = async (email) => {
  const result = await pool.query(
    'SELECT account_locked_until FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    return { locked: false };
  }

  const user = result.rows[0];
  if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
    return { locked: true, lockedUntil: user.account_locked_until };
  }

  return { locked: false };
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  handleFailedLogin,
  resetFailedLoginAttempts,
  isAccountLocked
};
