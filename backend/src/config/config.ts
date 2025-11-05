import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/noteverse',
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  jwtExpiration: process.env.JWT_EXPIRATION || '7d',
  repoBasePath: process.env.REPO_BASE_PATH || './repos',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
