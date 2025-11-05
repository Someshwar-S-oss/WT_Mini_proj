import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { body, validationResult } from 'express-validator';

const authService = new AuthService();

export const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('username').isLength({ min: 3, max: 30 }).trim(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty().trim(),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { user, token } = await authService.register(req.body);
    res.status(201).json({ user, token });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { user, token } = await authService.login(req.body);
    res.json({ user, token });
  } catch (error: any) {
    res.status(401).json({ message: error.message });
  }
};

export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await authService.getUserById(req.userId!);
    res.json({ user });
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
};
