import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { authenticateToken } from '../middleware/auth';
import { checkNotebookPermission } from '../middleware/permissions';
import { CollaboratorRole } from '../models/Notebook';
import Notebook from '../models/Notebook';

const router = Router({ mergeParams: true });

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, _file, cb) => {
    const { id } = req.params;
    const notebook = await Notebook.findById(id);
    
    if (!notebook) {
      return cb(new Error('Notebook not found'), '');
    }
    
    const uploadDir = path.join(process.cwd(), 'repos', notebook.gitRepoPath, 'uploads');
    
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'text/plain',
      'text/markdown',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and text files are allowed.'));
    }
  }
});

router.use(authenticateToken);

// Upload single file
router.post(
  '/',
  checkNotebookPermission([CollaboratorRole.OWNER, CollaboratorRole.EDITOR]),
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
      }

      const { id } = req.params;
      const relativePath = `uploads/${req.file.filename}`;
      
      res.status(201).json({
        message: 'File uploaded successfully',
        file: {
          originalName: req.file.originalname,
          filename: req.file.filename,
          path: relativePath,
          size: req.file.size,
          mimetype: req.file.mimetype,
          url: `/api/notebooks/${id}/uploads/${req.file.filename}`,
        }
      });
    } catch (error: any) {
      console.error('Error uploading file:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Upload multiple files
router.post(
  '/batch',
  checkNotebookPermission([CollaboratorRole.OWNER, CollaboratorRole.EDITOR]),
  upload.array('files', 10),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        res.status(400).json({ message: 'No files uploaded' });
        return;
      }

      const { id } = req.params;
      
      const files = req.files.map(file => ({
        originalName: file.originalname,
        filename: file.filename,
        path: `uploads/${file.filename}`,
        size: file.size,
        mimetype: file.mimetype,
        url: `/api/notebooks/${id}/uploads/${file.filename}`,
      }));
      
      res.status(201).json({
        message: 'Files uploaded successfully',
        files
      });
    } catch (error: any) {
      console.error('Error uploading files:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Get uploaded file
router.get(
  '/:filename',
  checkNotebookPermission([CollaboratorRole.OWNER, CollaboratorRole.EDITOR, CollaboratorRole.VIEWER]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, filename } = req.params;
      
      const notebook = await Notebook.findById(id);
      if (!notebook) {
        res.status(404).json({ message: 'Notebook not found' });
        return;
      }
      
      const filePath = path.join(process.cwd(), 'repos', notebook.gitRepoPath, 'uploads', filename);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        res.status(404).json({ message: 'File not found' });
        return;
      }
      
      res.sendFile(filePath);
    } catch (error: any) {
      console.error('Error retrieving file:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Delete uploaded file
router.delete(
  '/:filename',
  checkNotebookPermission([CollaboratorRole.OWNER, CollaboratorRole.EDITOR]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, filename } = req.params;
      
      const notebook = await Notebook.findById(id);
      if (!notebook) {
        res.status(404).json({ message: 'Notebook not found' });
        return;
      }
      
      const filePath = path.join(process.cwd(), 'repos', notebook.gitRepoPath, 'uploads', filename);
      
      await fs.unlink(filePath);
      
      res.json({ message: 'File deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting file:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;
