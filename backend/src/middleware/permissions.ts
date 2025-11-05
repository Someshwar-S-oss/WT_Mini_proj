import { Request, Response, NextFunction } from 'express';
import Notebook, { CollaboratorRole } from '../models/Notebook';
import mongoose from 'mongoose';

export const checkNotebookPermission = (allowedRoles: CollaboratorRole[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const notebookId = req.params.id;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ message: 'Not authenticated' });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(notebookId)) {
        res.status(400).json({ message: 'Invalid notebook ID' });
        return;
      }

      const notebook = await Notebook.findById(notebookId);
      
      if (!notebook) {
        res.status(404).json({ message: 'Notebook not found' });
        return;
      }

      // Check if user is owner
      if (notebook.owner.toString() === userId) {
        req.body.userRole = CollaboratorRole.OWNER;
        next();
        return;
      }

      // Check if user is a collaborator with sufficient permissions
      const collaborator = notebook.collaborators.find(
        (c) => c.user.toString() === userId
      );

      if (!collaborator) {
        res.status(403).json({ message: 'Access denied' });
        return;
      }

      if (!allowedRoles.includes(collaborator.role)) {
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }

      req.body.userRole = collaborator.role;
      next();
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  };
};
