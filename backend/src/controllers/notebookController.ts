import { Request, Response } from 'express';
import Notebook from '../models/Notebook';
import Branch from '../models/Branch';
import { GitService } from '../services/gitService';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';

export const createNotebookValidation = [
  body('name').notEmpty().trim().isLength({ max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('courseName').optional().trim(),
  body('courseCode').optional().trim(),
  body('isPublic').optional().isBoolean(),
];

export const createNotebook = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { name, description, courseName, courseCode, isPublic } = req.body;
    const userId = req.userId!;

    // Generate a unique repo path first
    const tempId = new mongoose.Types.ObjectId();
    const repoPath = tempId.toString();

    // Create notebook with the repo path
    const notebook = await Notebook.create({
      name,
      description,
      courseName,
      courseCode,
      isPublic: isPublic || false,
      owner: userId,
      gitRepoPath: repoPath,
      collaborators: [],
    });

    // Initialize Git repository
    const gitService = new GitService(repoPath);
    await gitService.initRepo();

    // Create default main branch
    await Branch.create({
      name: 'main',
      isDefault: true,
      notebook: notebook._id,
    });

    res.status(201).json({ notebook });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserNotebooks = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const notebooks = await Notebook.find({
      $or: [
        { owner: userId },
        { 'collaborators.user': userId },
      ],
    })
      .populate('owner', 'username name')
      .sort({ updatedAt: -1 });

    res.json({ notebooks });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getNotebookById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid notebook ID' });
      return;
    }

    const notebook = await Notebook.findById(id)
      .populate('owner', 'username name email')
      .populate('collaborators.user', 'username name email');

    if (!notebook) {
      res.status(404).json({ message: 'Notebook not found' });
      return;
    }

    // Check access permissions
    const isOwner = notebook.owner._id.toString() === userId;
    const isCollaborator = notebook.collaborators.some(
      (c) => c.user._id.toString() === userId
    );

    if (!isOwner && !isCollaborator && !notebook.isPublic) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    res.json({ notebook });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateNotebook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, courseName, courseCode, isPublic } = req.body;

    const notebook = await Notebook.findByIdAndUpdate(
      id,
      { name, description, courseName, courseCode, isPublic },
      { new: true, runValidators: true }
    );

    if (!notebook) {
      res.status(404).json({ message: 'Notebook not found' });
      return;
    }

    res.json({ notebook });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteNotebook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const notebook = await Notebook.findByIdAndDelete(id);

    if (!notebook) {
      res.status(404).json({ message: 'Notebook not found' });
      return;
    }

    // Also delete all related data
    await Branch.deleteMany({ notebook: id });
    // TODO: Delete commits, PRs, comments, tags

    res.json({ message: 'Notebook deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const searchPublicNotebooks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, courseName } = req.query;

    const filter: any = { isPublic: true };

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ];
    }

    if (courseName) {
      filter.courseName = { $regex: courseName, $options: 'i' };
    }

    const notebooks = await Notebook.find(filter)
      .populate('owner', 'username name')
      .limit(50)
      .sort({ updatedAt: -1 });

    res.json({ notebooks });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
