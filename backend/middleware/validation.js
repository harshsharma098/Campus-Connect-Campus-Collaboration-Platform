const { body, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Return first error message for simpler frontend handling
    const firstError = errors.array()[0];
    return res.status(400).json({ 
      error: firstError.msg,
      errors: errors.array() // Also include full array for detailed error handling
    });
  }
  next();
};

// User registration validation
const validateRegister = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('firstName').trim().isLength({ min: 1, max: 100 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1, max: 100 }).withMessage('Last name is required'),
  body('role').optional().isIn(['student', 'mentor', 'admin']).withMessage('Invalid role'),
  handleValidationErrors
];

// User login validation
const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

// Question validation
const validateQuestion = [
  body('title').trim().isLength({ min: 10, max: 255 }).withMessage('Title must be between 10 and 255 characters'),
  body('content').trim().isLength({ min: 20 }).withMessage('Content must be at least 20 characters'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  handleValidationErrors
];

// Answer validation
const validateAnswer = [
  body('content').trim().isLength({ min: 10 }).withMessage('Answer must be at least 10 characters'),
  handleValidationErrors
];

// Event validation
const validateEvent = [
  body('title').trim().isLength({ min: 5, max: 255 }).withMessage('Title must be between 5 and 255 characters'),
  body('description').trim().isLength({ min: 20 }).withMessage('Description must be at least 20 characters'),
  body('eventDate').isISO8601().withMessage('Valid event date is required'),
  body('location').optional().trim().isLength({ max: 255 }).withMessage('Location too long'),
  handleValidationErrors
];

// Mentorship request validation
const validateMentorshipRequest = [
  body('message').optional().trim().isLength({ max: 1000 }).withMessage('Message too long'),
  handleValidationErrors
];

// Mentor profile validation
const validateMentorProfile = [
  body('skills').isArray({ min: 1 }).withMessage('At least one skill is required'),
  body('skills.*').trim().isLength({ min: 1, max: 50 }).withMessage('Each skill must be between 1 and 50 characters'),
  body('experienceYears').optional().isInt({ min: 0 }).withMessage('Experience years must be a non-negative integer'),
  body('maxMentees').optional().isInt({ min: 1, max: 20 }).withMessage('Max mentees must be between 1 and 20'),
  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateLogin,
  validateQuestion,
  validateAnswer,
  validateEvent,
  validateMentorshipRequest,
  validateMentorProfile,
  handleValidationErrors
};
