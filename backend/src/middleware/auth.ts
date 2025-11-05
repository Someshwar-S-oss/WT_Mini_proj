import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

// Extend Express Request type
declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
    username?: string;
  }
}

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ message: 'Authentication token required' });
      return;
    }

    const payload = verifyToken(token);
    req.userId = payload.userId;
    req.username = payload.username;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};
