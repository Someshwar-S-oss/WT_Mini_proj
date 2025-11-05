import jwt from 'jsonwebtoken';
import { config } from '../config/config';

export interface TokenPayload {
  userId: string;
  username: string;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiration,
  } as any);
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
};
