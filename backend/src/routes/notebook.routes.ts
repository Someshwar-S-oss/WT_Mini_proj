import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkNotebookPermission } from '../middleware/permissions';
import { CollaboratorRole } from '../models/Notebook';
import {
  createNotebook,
  getUserNotebooks,
  getNotebookById,
  updateNotebook,
  deleteNotebook,
  searchPublicNotebooks,
  createNotebookValidation,
} from '../controllers/notebookController';

const router = Router();

// Public routes
router.get('/public', searchPublicNotebooks);

// Protected routes
router.use(authenticateToken);

router.post('/', createNotebookValidation, createNotebook);
router.get('/', getUserNotebooks);
router.get('/:id', getNotebookById);
router.put(
  '/:id',
  checkNotebookPermission([CollaboratorRole.OWNER]),
  updateNotebook
);
router.delete(
  '/:id',
  checkNotebookPermission([CollaboratorRole.OWNER]),
  deleteNotebook
);

// File operations
router.post(
  '/:id/files',
  checkNotebookPermission([CollaboratorRole.OWNER, CollaboratorRole.EDITOR]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { filePath, content, branch } = req.body;

      if (!filePath) {
        res.status(400).json({ message: 'File path is required' });
        return;
      }

      const notebook = await import('../models/Notebook').then(m => m.default.findById(id));
      if (!notebook) {
        res.status(404).json({ message: 'Notebook not found' });
        return;
      }

      const { GitService } = await import('../services/gitService');
      const gitService = new GitService(notebook.gitRepoPath);
      
      // Ensure repo is initialized
      const isInitialized = await gitService.isRepoInitialized();
      if (!isInitialized) {
        await gitService.initRepo();
      }
      
      // If branch is specified, checkout that branch first (only if repo has commits)
      if (branch) {
        try {
          await gitService.checkoutBranch(branch);
        } catch (error: any) {
          // Ignore checkout errors if no commits yet
          console.log('Checkout skipped:', error.message);
        }
      }
      
      // Write file to working directory
      await gitService.writeFile(filePath, content || '');

      res.json({ message: 'File saved successfully', filePath });
    } catch (error: any) {
      console.error('Error saving file:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Get git status
router.get(
  '/:id/status',
  checkNotebookPermission([CollaboratorRole.OWNER, CollaboratorRole.EDITOR, CollaboratorRole.VIEWER]),
  async (req, res) => {
    try {
      const { id } = req.params;

      const notebook = await import('../models/Notebook').then(m => m.default.findById(id));
      if (!notebook) {
        res.status(404).json({ message: 'Notebook not found' });
        return;
      }

      const { GitService } = await import('../services/gitService');
      const gitService = new GitService(notebook.gitRepoPath);
      
      const status = await gitService.getStatus();
      const currentBranch = await gitService.getCurrentBranch();

      res.json({ 
        status,
        currentBranch,
        hasChanges: status.files.length > 0
      });
    } catch (error: any) {
      console.error('Error getting status:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;
