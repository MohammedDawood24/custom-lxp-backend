import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import * as auth from '../controllers/authController.js';

const router = Router();

const loginRules = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

const registerRules = [
  body('first_name').trim().isLength({ min: 1, max: 100 }),
  body('last_name').trim().isLength({ min: 1, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isStrongPassword({ minLength: 8, minUppercase: 1, minNumbers: 1, minSymbols: 1 })
    .withMessage('Password must be 8+ chars with uppercase, number, and symbol'),
];

const changePasswordRules = [
  body('current_password').notEmpty(),
  body('new_password').isStrongPassword({ minLength: 8, minUppercase: 1, minNumbers: 1, minSymbols: 1 }),
];

router.post('/register', validate(registerRules), auth.register);
router.post('/login', validate(loginRules), auth.login);
router.post('/refresh', auth.refreshAccessToken);
router.post('/logout', auth.logout);
router.post('/forgot-password', validate([body('email').isEmail()]), auth.forgotPassword);
router.post('/reset-password', validate([
  body('token').notEmpty(),
  body('password').isStrongPassword({ minLength: 8, minUppercase: 1, minNumbers: 1, minSymbols: 1 }),
]), auth.resetPassword);

// Protected
router.get('/me', authenticate, auth.getMe);
router.put('/profile', authenticate, auth.updateProfile);
router.put('/change-password', authenticate, validate(changePasswordRules), auth.changePassword);

export default router;
