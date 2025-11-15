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

router.get(
  '/',
  checkNotebookPermission([CollaboratorRole.OWNER, CollaboratorRole.EDITOR, CollaboratorRole.VIEWER]),
  getBranches
);
router.post(
  '/',
  checkNotebookPermission([CollaboratorRole.OWNER, CollaboratorRole.EDITOR]),
  createBranchValidation,
  createBranch
);
router.get(
  '/:name',
  checkNotebookPermission([CollaboratorRole.OWNER, CollaboratorRole.EDITOR, CollaboratorRole.VIEWER]),
  getBranchByName
);
router.delete(
  '/:name',
  checkNotebookPermission([CollaboratorRole.OWNER, CollaboratorRole.EDITOR]),
  deleteBranch
);
router.post(
  '/:name/checkout',
  checkNotebookPermission([CollaboratorRole.OWNER, CollaboratorRole.EDITOR, CollaboratorRole.VIEWER]),
  checkoutBranch
);

export default router;
