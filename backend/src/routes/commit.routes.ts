import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkNotebookPermission } from '../middleware/permissions';
import { CollaboratorRole } from '../models/Notebook';
import {
  createCommit,
  getCommits,
  getCommitByHash,
  getCommitDiff,
  getFileTree,
  getFileContent,
  createCommitValidation,
} from '../controllers/commitController';

const router = Router({ mergeParams: true });

router.use(authenticateToken);

router.get('/', getCommits);
router.post(
  '/',
  checkNotebookPermission([CollaboratorRole.OWNER, CollaboratorRole.EDITOR]),
  createCommitValidation,
  createCommit
);
router.get('/files', getFileTree);
router.get('/file-content', getFileContent);
router.get('/:hash', getCommitByHash);
router.get('/:hash/diff', getCommitDiff);

export default router;
