import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  register,
  login,
  getCurrentUser,
  registerValidation,
  loginValidation,
} from '../controllers/authController';

const router = Router();

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', authenticateToken, getCurrentUser);

export default router;
