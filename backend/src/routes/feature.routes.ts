import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import StarredNotebook from '../models/StarredNotebook';
import Activity from '../models/Activity';
import Notebook from '../models/Notebook';

const router = Router();

router.use(authenticateToken);

// Star a notebook
router.post('/:id/star', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    // Check if already starred
    const existing = await StarredNotebook.findOne({ user: userId, notebook: id });
    if (existing) {
      res.status(400).json({ message: 'Notebook already starred' });
      return;
    }

    // Create star
    await StarredNotebook.create({ user: userId, notebook: id });

    // Increment star count
    await Notebook.findByIdAndUpdate(id, { $inc: { starCount: 1 } });

    // Log activity
    await Activity.create({
      notebook: id,
      user: userId,
      type: 'notebook_created',
      description: 'Starred this notebook',
    });

    res.status(201).json({ message: 'Notebook starred successfully' });
  } catch (error: any) {
    console.error('Error starring notebook:', error);
    res.status(500).json({ message: error.message });
  }
});

// Unstar a notebook
router.delete('/:id/star', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const starred = await StarredNotebook.findOneAndDelete({ user: userId, notebook: id });
    
    if (!starred) {
      res.status(404).json({ message: 'Notebook not starred' });
      return;
    }

    // Decrement star count
    await Notebook.findByIdAndUpdate(id, { $inc: { starCount: -1 } });

    res.json({ message: 'Notebook unstarred successfully' });
  } catch (error: any) {
    console.error('Error unstarring notebook:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get starred notebooks
router.get('/starred', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const starred = await StarredNotebook.find({ user: userId })
      .populate({
        path: 'notebook',
        populate: { path: 'owner', select: 'username name email' }
      })
      .sort({ starredAt: -1 });

    const notebooks = starred.map(s => s.notebook).filter(n => n !== null);

    res.json({ notebooks });
  } catch (error: any) {
    console.error('Error fetching starred notebooks:', error);
    res.status(500).json({ message: error.message });
  }
});

// Check if notebook is starred
router.get('/:id/star/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const starred = await StarredNotebook.findOne({ user: userId, notebook: id });

    res.json({ isStarred: !!starred });
  } catch (error: any) {
    console.error('Error checking star status:', error);
    res.status(500).json({ message: error.message });
  }
});

// Fork a notebook
router.post('/:id/fork', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const originalNotebook = await Notebook.findById(id);
    if (!originalNotebook) {
      res.status(404).json({ message: 'Notebook not found' });
      return;
    }

    // Create new notebook
    const forkedNotebook = await Notebook.create({
      name: `${originalNotebook.name} (Fork)`,
      description: originalNotebook.description,
      courseName: originalNotebook.courseName,
      courseCode: originalNotebook.courseCode,
      isPublic: false,
      owner: userId,
      gitRepoPath: new Date().getTime().toString(),
      collaborators: [],
    });

    // Copy git repository
    const { GitService } = await import('../services/gitService');
    const forkedGit = new GitService(forkedNotebook.gitRepoPath);

    await forkedGit.initRepo();

    // Increment fork count
    await Notebook.findByIdAndUpdate(id, { $inc: { forkCount: 1 } });

    // Log activity
    await Activity.create({
      notebook: id,
      user: userId,
      type: 'notebook_forked',
      description: `Forked this notebook`,
      metadata: { forkedNotebookId: forkedNotebook._id },
    });

    res.status(201).json({ notebook: forkedNotebook });
  } catch (error: any) {
    console.error('Error forking notebook:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get notebook activity
router.get('/:id/activity', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const activities = await Activity.find({ notebook: id })
      .populate('user', 'username name')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({ activities });
  } catch (error: any) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get user activity
router.get('/activity/me', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { limit = 50 } = req.query;

    const activities = await Activity.find({ user: userId })
      .populate('notebook', 'name')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({ activities });
  } catch (error: any) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ message: error.message });
  }
});

// Search notebooks
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, course, sort = 'relevance' } = req.query;
    const userId = req.userId!;

    let query: any = {
      $or: [
        { owner: userId },
        { 'collaborators.user': userId },
        { isPublic: true },
      ],
    };

    if (q && typeof q === 'string') {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { courseName: { $regex: q, $options: 'i' } },
          { courseCode: { $regex: q, $options: 'i' } },
        ],
      });
    }

    if (course && typeof course === 'string') {
      query.courseName = { $regex: course, $options: 'i' };
    }

    let sortOption: any = { updatedAt: -1 };
    if (sort === 'stars') {
      sortOption = { starCount: -1, updatedAt: -1 };
    } else if (sort === 'views') {
      sortOption = { viewCount: -1, updatedAt: -1 };
    } else if (sort === 'forks') {
      sortOption = { forkCount: -1, updatedAt: -1 };
    }

    const notebooks = await Notebook.find(query)
      .populate('owner', 'username name')
      .sort(sortOption)
      .limit(50);

    res.json({ notebooks, count: notebooks.length });
  } catch (error: any) {
    console.error('Error searching notebooks:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
