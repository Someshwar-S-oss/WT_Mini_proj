import { Request, Response } from 'express';
import Branch from '../models/Branch';
import Notebook from '../models/Notebook';
import { GitService } from '../services/gitService';
import { body, validationResult } from 'express-validator';

export const createBranchValidation = [
  body('description').optional().trim(),
  body('fromBranch').optional().trim(),
  body('sourceBranch').optional().trim(),
];

export const createBranch = async (req: Request, res: Response): Promise<void> => {
  try {
    // Accept both 'name' and 'branchName', and 'fromBranch' and 'sourceBranch'
    const name = req.body.name || req.body.branchName;
    const fromBranch = req.body.fromBranch || req.body.sourceBranch;
    const { description } = req.body;

    if (!name) {
      res.status(400).json({ message: 'Branch name is required' });
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;

    // Check if branch already exists
    const existingBranch = await Branch.findOne({ notebook: id, name });
    if (existingBranch) {
      res.status(400).json({ message: 'Branch already exists' });
      return;
    }

    // Get notebook to get repo path
    const notebook = await Notebook.findById(id);
    if (!notebook) {
      res.status(404).json({ message: 'Notebook not found' });
      return;
    }

    // Verify source branch exists
    const sourceBranchName = fromBranch || 'main';
    const sourceBranch = await Branch.findOne({ notebook: id, name: sourceBranchName });
    if (!sourceBranch) {
      res.status(404).json({ message: `Source branch "${sourceBranchName}" not found` });
      return;
    }

    // Create branch in Git
    const gitService = new GitService(notebook.gitRepoPath);
    
    // Ensure repo is initialized with at least one commit
    const isInitialized = await gitService.isRepoInitialized();
    if (!isInitialized) {
      console.log('Initializing repository...');
      await gitService.initRepo();
    } else {
      // Check if there are commits
      try {
        const log = await gitService.getCommitHistory('main', 1);
        if (!log || !log.latest) {
          console.log('No commits found, initializing...');
          await gitService.initRepo();
        }
      } catch (error) {
        console.log('Error checking commits, initializing...');
        await gitService.initRepo();
      }
    }
    
    try {
      await gitService.createBranch(name, sourceBranchName);
    } catch (error: any) {
      console.error('Branch creation error:', error);
      if (error.message.includes('no commits yet') || error.message.includes('not a commit')) {
        res.status(400).json({ 
          message: 'Cannot create branch yet. Please make an initial commit to the notebook first by editing a file.' 
        });
        return;
      }
      throw error;
    }

    // Get the last commit from source branch
    const lastCommitHash = sourceBranch.lastCommitHash;

    // Create branch in database
    const branch = await Branch.create({
      name,
      description,
      notebook: id,
      isDefault: false,
      lastCommitHash,
    });

    res.status(201).json({ branch });
  } catch (error: any) {
    console.error('Error creating branch:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getBranches = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const branches = await Branch.find({ notebook: id }).sort({ isDefault: -1, createdAt: 1 });

    res.json({ branches });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getBranchByName = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, name } = req.params;

    const branch = await Branch.findOne({ notebook: id, name });

    if (!branch) {
      res.status(404).json({ message: 'Branch not found' });
      return;
    }

    res.json({ branch });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteBranch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, name } = req.params;

    const branch = await Branch.findOne({ notebook: id, name });

    if (!branch) {
      res.status(404).json({ message: 'Branch not found' });
      return;
    }

    if (branch.isDefault) {
      res.status(400).json({ message: 'Cannot delete default branch' });
      return;
    }

    // Delete from Git
    const notebook = await Notebook.findById(id);
    if (notebook) {
      const gitService = new GitService(notebook.gitRepoPath);
      await gitService.deleteBranch(name);
    }

    // Delete from database
    await branch.deleteOne();

    res.json({ message: 'Branch deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const checkoutBranch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, name } = req.params;

    const branch = await Branch.findOne({ notebook: id, name });

    if (!branch) {
      res.status(404).json({ message: 'Branch not found' });
      return;
    }

    const notebook = await Notebook.findById(id);
    if (!notebook) {
      res.status(404).json({ message: 'Notebook not found' });
      return;
    }

    // Checkout in Git
    const gitService = new GitService(notebook.gitRepoPath);
    await gitService.checkoutBranch(name);

    res.json({ message: 'Branch checked out successfully', branch });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
