import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkNotebookPermission } from '../middleware/permissions';
import { CollaboratorRole } from '../models/Notebook';
import Comment from '../models/Comment';
import Notification from '../models/Notification';
import Activity from '../models/Activity';
import Notebook from '../models/Notebook';
import { body, validationResult } from 'express-validator';

const router = Router({ mergeParams: true });

router.use(authenticateToken);

// Get comments for notebook
router.get(
  '/',
  checkNotebookPermission([CollaboratorRole.OWNER, CollaboratorRole.EDITOR, CollaboratorRole.VIEWER]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { commitId, filePath } = req.query;

      const query: any = { notebook: id, parentComment: null };
      
      if (commitId) {
        query.commit = commitId;
      }
      
      if (filePath) {
        query.filePath = filePath;
      }

      const comments = await Comment.find(query)
        .populate('author', 'username name')
        .populate({
          path: 'replies',
          populate: { path: 'author', select: 'username name' }
        })
        .sort({ createdAt: -1 });

      res.json({ comments });
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Create comment
router.post(
  '/',
  checkNotebookPermission([CollaboratorRole.OWNER, CollaboratorRole.EDITOR, CollaboratorRole.VIEWER]),
  [
    body('content').notEmpty().trim().isLength({ max: 2000 }),
    body('commitId').optional(),
    body('filePath').optional().trim(),
    body('lineNumber').optional().isInt(),
    body('parentCommentId').optional(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { content, commitId, filePath, lineNumber, parentCommentId } = req.body;
      const userId = req.userId!;

      const comment = await Comment.create({
        content,
        author: userId,
        notebook: id,
        commit: commitId,
        filePath,
        lineNumber,
        parentComment: parentCommentId,
      });

      // If this is a reply, add to parent's replies array
      if (parentCommentId) {
        await Comment.findByIdAndUpdate(parentCommentId, {
          $push: { replies: comment._id }
        });
      }

      // Get notebook for notifications
      const notebook = await Notebook.findById(id).populate('owner collaborators.user');
      
      if (notebook) {
        // Notify owner and collaborators (except the commenter)
        const notifyUsers = [notebook.owner._id];
        notebook.collaborators.forEach(c => {
          if (c.user._id.toString() !== userId) {
            notifyUsers.push(c.user._id);
          }
        });

        const uniqueUsers = [...new Set(notifyUsers.map(u => u.toString()))].filter(u => u !== userId);

        await Notification.insertMany(
          uniqueUsers.map(user => ({
            user,
            type: 'comment_added',
            title: 'New Comment',
            message: `New comment on "${notebook.name}"`,
            link: `/notebook/${id}`,
            relatedNotebook: id,
            relatedUser: userId,
          }))
        );

        // Log activity
        await Activity.create({
          notebook: id,
          user: userId,
          type: 'comment_added',
          description: 'Added a comment',
          metadata: { commentId: comment._id },
        });
      }

      const populatedComment = await Comment.findById(comment._id)
        .populate('author', 'username name');

      res.status(201).json({ comment: populatedComment });
    } catch (error: any) {
      console.error('Error creating comment:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Update comment
router.put(
  '/:commentId',
  checkNotebookPermission([CollaboratorRole.OWNER, CollaboratorRole.EDITOR, CollaboratorRole.VIEWER]),
  [body('content').notEmpty().trim().isLength({ max: 2000 })],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { commentId } = req.params;
      const { content } = req.body;
      const userId = req.userId!;

      const comment = await Comment.findById(commentId);
      
      if (!comment) {
        res.status(404).json({ message: 'Comment not found' });
        return;
      }

      if (comment.author.toString() !== userId) {
        res.status(403).json({ message: 'You can only edit your own comments' });
        return;
      }

      comment.content = content;
      await comment.save();

      const populatedComment = await Comment.findById(comment._id)
        .populate('author', 'username name');

      res.json({ comment: populatedComment });
    } catch (error: any) {
      console.error('Error updating comment:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Delete comment
router.delete(
  '/:commentId',
  checkNotebookPermission([CollaboratorRole.OWNER, CollaboratorRole.EDITOR, CollaboratorRole.VIEWER]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { commentId } = req.params;
      const userId = req.userId!;

      const comment = await Comment.findById(commentId);
      
      if (!comment) {
        res.status(404).json({ message: 'Comment not found' });
        return;
      }

      if (comment.author.toString() !== userId) {
        res.status(403).json({ message: 'You can only delete your own comments' });
        return;
      }

      // Delete all replies
      if (comment.replies && comment.replies.length > 0) {
        await Comment.deleteMany({ _id: { $in: comment.replies } });
      }

      // Remove from parent's replies if this is a reply
      if (comment.parentComment) {
        await Comment.findByIdAndUpdate(comment.parentComment, {
          $pull: { replies: comment._id }
        });
      }

      await comment.deleteOne();

      res.json({ message: 'Comment deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;
