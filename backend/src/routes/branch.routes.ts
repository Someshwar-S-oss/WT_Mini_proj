import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkNotebookPermission } from '../middleware/permissions';
import { CollaboratorRole } from '../models/Notebook';
import {
  createBranch,
  getBranches,
  getBranchByName,
  deleteBranch,
  checkoutBranch,
  createBranchValidation,
} from '../controllers/branchController';

const router = Router({ mergeParams: true });

router.use(authenticateToken);

router.get('/', getBranches);
router.post(
  '/',
  checkNotebookPermission([CollaboratorRole.OWNER, CollaboratorRole.EDITOR]),
  createBranchValidation,
  createBranch
);
router.get('/:name', getBranchByName);
router.delete(
  '/:name',
  checkNotebookPermission([CollaboratorRole.OWNER, CollaboratorRole.EDITOR]),
  deleteBranch
);
router.post('/:name/checkout', checkoutBranch);

export default router;
