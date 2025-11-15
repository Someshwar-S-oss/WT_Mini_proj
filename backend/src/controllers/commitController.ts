import { Request, Response } from 'express';
import Commit from '../models/Commit';
import Branch from '../models/Branch';
import Notebook from '../models/Notebook';
import User from '../models/User';
import { GitService } from '../services/gitService';
import { body, validationResult } from 'express-validator';

export const createCommitValidation = [
  body('message').notEmpty().trim(),
  body('description').optional().trim(),
  body('branch').notEmpty(),
  body('files').isArray({ min: 1 }),
  body('files.*.path').notEmpty(),
  body('files.*.content').notEmpty(),
];

export const createCommit = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const { message, description, branch: branchName, files } = req.body;
    const userId = req.userId!;

    // Validate files array
    if (!files || !Array.isArray(files) || files.length === 0) {
      res.status(400).json({ message: 'Files array is required and must not be empty' });
      return;
    }

    // Validate each file has path and content
    for (const file of files) {
      if (!file.path || typeof file.path !== 'string') {
        res.status(400).json({ message: 'Each file must have a path' });
        return;
      }
      if (file.content === undefined || file.content === null) {
        res.status(400).json({ message: 'Each file must have content (can be empty string)' });
        return;
      }
    }

    // Get notebook and branch
    const notebook = await Notebook.findById(id);
    if (!notebook) {
      res.status(404).json({ message: 'Notebook not found' });
      return;
    }

    const branch = await Branch.findOne({ notebook: id, name: branchName });
    if (!branch) {
      res.status(404).json({ message: `Branch "${branchName}" not found` });
      return;
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Create commit in Git
    const gitService = new GitService(notebook.gitRepoPath);
    
    // Ensure repo is initialized
    const isInitialized = await gitService.isRepoInitialized();
    if (!isInitialized) {
      await gitService.initRepo();
    }
    
    // Ensure we're on the correct branch (skip if no commits yet)
    try {
      await gitService.checkoutBranch(branchName);
    } catch (error: any) {
      // If this is the first commit, checkout will fail - that's ok
      console.log('Checkout skipped for first commit:', error.message);
    }
    
    // Commit changes
    const { hash: commitHash, parentHash } = await gitService.commit(
      files,
      message,
      user.name || user.username,
      user.email
    );

    // Calculate file changes
    const filesChanged = files.map((file: any) => ({
      path: file.path,
      additions: file.content.split('\n').length,
      deletions: 0,
    }));

    const totalAdditions = filesChanged.reduce((sum: number, f: any) => sum + f.additions, 0);

    // Save commit to database
    const commit = await Commit.create({
      hash: commitHash,
      message,
      description,
      author: userId,
      notebook: id,
      branch: branch._id,
      parentHash,
      filesChanged,
      additions: totalAdditions,
      deletions: 0,
      timestamp: new Date(),
    });

    // Update branch's last commit
    branch.lastCommitHash = commitHash;
    await branch.save();

    // Populate commit data for response
    const populatedCommit = await Commit.findById(commit._id)
      .populate('author', 'username name email')
      .populate('branch', 'name');

    res.status(201).json({ commit: populatedCommit });
  } catch (error: any) {
    console.error('Error creating commit:', error);
    res.status(500).json({ message: error.message || 'Failed to create commit' });
  }
};

export const getCommits = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { branch, limit = 50 } = req.query;

    const filter: any = { notebook: id };
    if (branch) {
      const branchDoc = await Branch.findOne({ notebook: id, name: branch });
      if (branchDoc) {
        filter.branch = branchDoc._id;
      }
    }

    const commits = await Commit.find(filter)
      .populate('author', 'username name')
      .populate('branch', 'name')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit as string, 10));

    res.json({ commits });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getCommitByHash = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, hash } = req.params;

    const commit = await Commit.findOne({ notebook: id, hash })
      .populate('author', 'username name email')
      .populate('branch', 'name');

    if (!commit) {
      res.status(404).json({ message: 'Commit not found' });
      return;
    }

    res.json({ commit });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getCommitDiff = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, hash } = req.params;

    const notebook = await Notebook.findById(id);
    if (!notebook) {
      res.status(404).json({ message: 'Notebook not found' });
      return;
    }

    const commit = await Commit.findOne({ notebook: id, hash })
      .populate('author', 'username name email')
      .populate('branch', 'name');
      
    if (!commit) {
      res.status(404).json({ message: 'Commit not found' });
      return;
    }

    // Get diff from Git
    const gitService = new GitService(notebook.gitRepoPath);
    let diff = '';
    
    try {
      if (commit.parentHash) {
        console.log(`Getting diff between ${commit.parentHash} and ${hash}`);
        diff = await gitService.getDiff(commit.parentHash, hash);
      } else {
        // First commit - show all files as additions (use special 4b825dc git empty tree hash)
        console.log(`Getting diff for first commit ${hash}`);
        diff = await gitService.getDiff('4b825dc642cb6eb9a060e54bf8d69288fbee4904', hash);
      }
      console.log(`Diff length: ${diff.length} characters`);
    } catch (error: any) {
      console.error('Error getting diff:', error.message);
      diff = '';
    }

    // Parse diff into per-file diffs
    const parseDiffByFile = (diffText: string) => {
      const fileMap = new Map<string, string>();
      
      if (!diffText || diffText.length === 0) {
        console.log('No diff text to parse');
        return fileMap;
      }
      
      const lines = diffText.split('\n');
      let currentFile = '';
      let currentDiff: string[] = [];

      for (const line of lines) {
        // Check for file headers like "diff --git a/file.txt b/file.txt"
        if (line.startsWith('diff --git')) {
          // Save previous file
          if (currentFile && currentDiff.length > 0) {
            fileMap.set(currentFile, currentDiff.join('\n'));
            console.log(`Parsed diff for ${currentFile}: ${currentDiff.length} lines`);
          }
          
          // Extract filename from "diff --git a/file.txt b/file.txt"
          const match = line.match(/diff --git a\/(.+?) b\//);
          currentFile = match ? match[1] : '';
          currentDiff = [line];
          console.log(`Found file in diff: ${currentFile}`);
        } else if (currentFile) {
          currentDiff.push(line);
        }
      }

      // Save last file
      if (currentFile && currentDiff.length > 0) {
        fileMap.set(currentFile, currentDiff.join('\n'));
        console.log(`Parsed diff for ${currentFile}: ${currentDiff.length} lines`);
      }

      console.log(`Total files parsed: ${fileMap.size}`);
      return fileMap;
    };

    const fileDiffMap = parseDiffByFile(diff);

    // Return commit with file changes from database, including individual file diffs
    const files = commit.filesChanged.map((file: any) => {
      const fileDiff = fileDiffMap.get(file.path);
      console.log(`File ${file.path}: diff ${fileDiff ? 'found' : 'NOT FOUND'} (${fileDiff?.length || 0} chars)`);
      return {
        path: file.path,
        additions: file.additions,
        deletions: file.deletions,
        diff: fileDiff || '',
      };
    });

    res.json({ 
      diff, 
      commit,
      files 
    });
  } catch (error: any) {
    console.error('Error in getCommitDiff:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getFileTree = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { commit } = req.query;

    const notebook = await Notebook.findById(id);
    if (!notebook) {
      res.status(404).json({ message: 'Notebook not found' });
      return;
    }

    const gitService = new GitService(notebook.gitRepoPath);
    
    // If commit is a branch name, use HEAD, otherwise use the commit hash
    let commitRef = commit as string;
    if (!commitRef || commitRef === 'main' || commitRef === 'master') {
      commitRef = 'HEAD';
    }
    
    const tree = await gitService.getFileTree(commitRef);

    res.json(tree);
  } catch (error: any) {
    console.error('Error in getFileTree:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getFileContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { path: filePath, commit } = req.query;

    if (!filePath) {
      res.status(400).json({ message: 'File path is required' });
      return;
    }

    const notebook = await Notebook.findById(id);
    if (!notebook) {
      res.status(404).json({ message: 'Notebook not found' });
      return;
    }

    const gitService = new GitService(notebook.gitRepoPath);
    const content = await gitService.getFileContent(
      filePath as string,
      commit as string
    );

    res.json({ content, path: filePath });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
