import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/config';
import { connectDatabase } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';

// Import routes
import authRoutes from './routes/auth.routes';
import notebookRoutes from './routes/notebook.routes';
import branchRoutes from './routes/branch.routes';
import commitRoutes from './routes/commit.routes';
import userRoutes from './routes/user.routes';
import uploadRoutes from './routes/upload.routes';
import featureRoutes from './routes/feature.routes';
import notificationRoutes from './routes/notification.routes';

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/notebooks', featureRoutes); // Must be before notebookRoutes for /starred, /search, /activity
app.use('/api/notebooks', notebookRoutes);
app.use('/api/notebooks/:id/branches', branchRoutes);
app.use('/api/notebooks/:id/commits', commitRoutes);
app.use('/api/notebooks/:id/uploads', uploadRoutes);
app.use('/api/notebooks/:id/comments', require('./routes/comment.routes').default);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Start listening
    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`CORS origin: ${config.corsOrigin}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();


export default app;
