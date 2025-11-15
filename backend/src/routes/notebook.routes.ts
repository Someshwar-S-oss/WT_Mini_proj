import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkNotebookPermission } from '../middleware/permissions';
import { CollaboratorRole } from '../models/Notebook';
import mongoose from 'mongoose';
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

// Add collaborator
router.post(
  '/:id/collaborators',
  checkNotebookPermission([CollaboratorRole.OWNER]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { userId, role } = req.body;

      if (!userId || !role) {
        res.status(400).json({ message: 'userId and role are required' });
        return;
      }

      if (!['VIEWER', 'EDITOR'].includes(role)) {
        res.status(400).json({ message: 'Invalid role. Must be VIEWER or EDITOR' });
        return;
      }

      const Notebook = await import('../models/Notebook').then(m => m.default);
      const notebook = await Notebook.findById(id);
      
      if (!notebook) {
        res.status(404).json({ message: 'Notebook not found' });
        return;
      }

      // Check if user is already a collaborator
      const existingCollaborator = notebook.collaborators.find(
        (c: any) => c.user.toString() === userId
      );

      if (existingCollaborator) {
        res.status(400).json({ message: 'User is already a collaborator' });
        return;
      }

      // Add the collaborator
      notebook.collaborators.push({
        user: new mongoose.Types.ObjectId(userId),
        role: role as CollaboratorRole,
        addedAt: new Date(),
      } as any);

      await notebook.save();

      // Create notification for the added collaborator
      const Notification = await import('../models/Notification').then(m => m.default);
      await Notification.create({
        user: userId,
        type: 'collaborator_added',
        title: 'Added as Collaborator',
        message: `You've been added as a ${role.toLowerCase()} to "${notebook.name}"`,
        link: `/notebook/${id}`,
        relatedNotebook: id,
        relatedUser: req.userId,
      });

      res.json({ message: 'Collaborator added successfully' });
    } catch (error: any) {
      console.error('Error adding collaborator:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Remove collaborator
router.delete(
  '/:id/collaborators/:userId',
  checkNotebookPermission([CollaboratorRole.OWNER]),
  async (req, res) => {
    try {
      const { id, userId } = req.params;

      const Notebook = await import('../models/Notebook').then(m => m.default);
      const notebook = await Notebook.findById(id);
      
      if (!notebook) {
        res.status(404).json({ message: 'Notebook not found' });
        return;
      }

      notebook.collaborators = notebook.collaborators.filter(
        (c: any) => c.user.toString() !== userId
      );

      await notebook.save();

      res.json({ message: 'Collaborator removed successfully' });
    } catch (error: any) {
      console.error('Error removing collaborator:', error);
      res.status(500).json({ message: error.message });
    }
  }
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

// Read file content
router.get(
  '/:id/file',
  checkNotebookPermission([CollaboratorRole.OWNER, CollaboratorRole.EDITOR, CollaboratorRole.VIEWER]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { path, branch } = req.query;

      if (!path) {
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
      
      // If branch is specified, checkout that branch first
      if (branch && typeof branch === 'string') {
        try {
          await gitService.checkoutBranch(branch);
        } catch (error: any) {
          console.log('Checkout skipped:', error.message);
        }
      }
      
      // Read file content
      const content = await gitService.readFile(path as string);

      res.json({ content });
    } catch (error: any) {
      console.error('Error reading file:', error);
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
