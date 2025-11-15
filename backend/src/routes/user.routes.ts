import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import User from '../models/User';

const router = express.Router();

// Search users by username
router.get('/search', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.query;

    if (!username || typeof username !== 'string') {
      res.status(400).json({ message: 'Username query parameter is required' });
      return;
    }

    // Search for users matching the username (case-insensitive, partial match)
    const users = await User.find({
      username: { $regex: username, $options: 'i' },
      _id: { $ne: req.userId }, // Exclude current user
    })
      .select('username email')
      .limit(10);

    res.json({ users });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Failed to search users' });
  }
});

export default router;
