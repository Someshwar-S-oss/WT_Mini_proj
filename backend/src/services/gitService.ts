import simpleGit, { SimpleGit, LogResult } from 'simple-git';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config/config';

export interface FileTreeItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeItem[];
}

export class GitService {
  private git: SimpleGit | null = null;
  private repoPath: string;

  constructor(notebookId: string) {
    this.repoPath = path.join(config.repoBasePath, notebookId);
  }

  private async ensureGit(): Promise<SimpleGit> {
    if (!this.git) {
      // Ensure directory exists before creating git instance
      await fs.mkdir(this.repoPath, { recursive: true });
      this.git = simpleGit(this.repoPath);
    }
    return this.git;
  }

  async initRepo(): Promise<void> {
    await fs.mkdir(this.repoPath, { recursive: true });
    const git = await this.ensureGit();
    await git.init();
    await git.addConfig('user.name', 'NoteVerse System');
    await git.addConfig('user.email', 'system@noteverse.com');
    
    // Explicitly set initial branch to main
    try {
      await git.raw(['branch', '-M', 'main']);
    } catch (error) {
      // Ignore error if branch doesn't exist yet
    }
    
    // Create initial README
    const readmePath = path.join(this.repoPath, 'README.md');
    await fs.writeFile(readmePath, '# Notebook\n\nInitial commit');
    await git.add('README.md');
    await git.commit('Initial commit');
    
    // Ensure we're on main branch after commit
    try {
      await git.raw(['branch', '-M', 'main']);
    } catch (error) {
      console.log('Could not rename branch to main:', error);
    }
  }

  async createBranch(branchName: string, fromBranch: string = 'main'): Promise<void> {
    const git = await this.ensureGit();
    
    // Check if there are any commits first
    try {
      const log = await git.log({ maxCount: 1 });
      if (!log || !log.latest) {
        // No commits yet, can't create branch from another branch
        throw new Error('Cannot create branch: repository has no commits yet. Please make an initial commit first.');
      }
    } catch (error: any) {
      if (error.message.includes('does not have any commits yet')) {
        throw new Error('Cannot create branch: repository has no commits yet. Please make an initial commit first.');
      }
      throw error;
    }
    
    await git.checkoutBranch(branchName, fromBranch);
  }

  async checkoutBranch(branchName: string): Promise<void> {
    const git = await this.ensureGit();
    
    // Check if there are any commits first
    try {
      const log = await git.log({ maxCount: 1 });
      if (!log || !log.latest) {
        // No commits yet, can't checkout
        console.log('No commits yet, skipping checkout');
        return;
      }
    } catch (error) {
      // No commits yet, can't checkout
      console.log('No commits yet, skipping checkout');
      return;
    }
    
    await git.checkout(branchName);
  }

  async listBranches(): Promise<string[]> {
    const git = await this.ensureGit();
    const branches = await git.branchLocal();
    return branches.all;
  }

  async deleteBranch(branchName: string, force: boolean = false): Promise<void> {
    const git = await this.ensureGit();
    await git.deleteLocalBranch(branchName, force);
  }

  async commit(
    files: { path: string; content: string }[],
    message: string,
    authorName: string,
    authorEmail: string
  ): Promise<{ hash: string; parentHash?: string }> {
    const git = await this.ensureGit();
    
    // Get current commit hash as parent (if exists)
    let parentHash: string | undefined;
    try {
      const log = await git.log({ maxCount: 1 });
      if (log && log.latest) {
        parentHash = log.latest.hash;
      }
    } catch (error) {
      // No commits yet, parentHash will be undefined
      parentHash = undefined;
    }
    
    // Configure author for this commit
    await git.addConfig('user.name', authorName, false, 'local');
    await git.addConfig('user.email', authorEmail, false, 'local');

    // Write files
    for (const file of files) {
      const filePath = path.join(this.repoPath, file.path);
      const dirPath = path.dirname(filePath);
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(filePath, file.content);
    }

    // Stage files
    await git.add(files.map((f) => f.path));
    
    // Check if there are changes to commit
    const status = await git.status();
    if (status.staged.length === 0) {
      throw new Error('No changes to commit');
    }
    
    // Commit
    const result = await git.commit(message);
    
    return {
      hash: result.commit,
      parentHash,
    };
  }

  async getCommitHistory(branch?: string, limit: number = 50): Promise<LogResult> {
    const git = await this.ensureGit();
    const options: any = { maxCount: limit };
    if (branch) {
      options.from = branch;
    }
    return await git.log(options);
  }

  async getCommitDetails(commitHash: string): Promise<any> {
    const git = await this.ensureGit();
    const log = await git.show([commitHash, '--stat']);
    return log;
  }

  async getFileContent(filePath: string, commitHash?: string): Promise<string> {
    const git = await this.ensureGit();
    
    // Check if repo is initialized
    const isRepo = await this.isRepoInitialized();
    if (!isRepo) {
      throw new Error('Repository not initialized');
    }
    
    if (commitHash && commitHash !== 'main' && commitHash !== 'master' && commitHash !== 'HEAD') {
      try {
        return await git.show([`${commitHash}:${filePath}`]);
      } catch (error) {
        // If commit doesn't exist, try reading from working directory
        const fullPath = path.join(this.repoPath, filePath);
        try {
          return await fs.readFile(fullPath, 'utf-8');
        } catch (e: any) {
          throw new Error(`File not found: ${filePath}`);
        }
      }
    }
    
    // For 'main', 'master', 'HEAD', or no commit hash, read from working directory
    const fullPath = path.join(this.repoPath, filePath);
    try {
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error: any) {
      throw new Error(`File not found: ${filePath}`);
    }
  }

  async getDiff(from: string, to: string = 'HEAD'): Promise<string> {
    const git = await this.ensureGit();
    return await git.diff([from, to]);
  }

  async mergeBranch(
    sourceBranch: string,
    targetBranch: string
  ): Promise<{ success: boolean; conflicts?: string[] }> {
    const git = await this.ensureGit();
    try {
      await this.checkoutBranch(targetBranch);
      const result = await git.merge([sourceBranch]);
      
      if (result.conflicts && result.conflicts.length > 0) {
        return {
          success: false,
          conflicts: result.conflicts.map((c) => c.file).filter((f): f is string => f !== undefined),
        };
      }
      
      return { success: true };
    } catch (error: any) {
      if (error.message.includes('CONFLICT')) {
        const status = await git.status();
        return {
          success: false,
          conflicts: status.conflicted,
        };
      }
      throw error;
    }
  }

  async getFileTree(commitHash?: string): Promise<FileTreeItem[]> {
    try {
      const git = await this.ensureGit();
      
      // Check if repo is initialized
      const isRepo = await this.isRepoInitialized();
      if (!isRepo) {
        console.log('Repository not initialized, initializing now...');
        await this.initRepo();
      }
      
      // Check if there are any commits
      try {
        const log = await git.log({ maxCount: 1 });
        if (!log || !log.latest) {
          console.log('No commits found in repository');
          return [];
        }
      } catch (error) {
        // No commits yet, return empty tree
        console.log('Error checking commits, repo may be empty');
        return [];
      }
      
      const ref = commitHash || 'HEAD';
      let files: string;
      
      try {
        files = await git.raw(['ls-tree', '-r', '--name-only', ref]);
      } catch (error: any) {
        // If branch doesn't exist or no commits, return empty tree
        console.error('Error getting file tree:', error.message);
        return [];
      }
      
      const tree: FileTreeItem[] = [];
      const fileList = files.trim().split('\n').filter((f) => f);

      for (const filePath of fileList) {
        const parts = filePath.split('/');
        let currentLevel = tree;

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          const isFile = i === parts.length - 1;
          
          let existing = currentLevel.find((item) => item.name === part);
          
          if (!existing) {
            existing = {
              name: part,
              path: parts.slice(0, i + 1).join('/'),
              type: isFile ? 'file' : 'directory',
              children: isFile ? undefined : [],
            };
            currentLevel.push(existing);
          }
          
          if (!isFile && existing.children) {
            currentLevel = existing.children;
          }
        }
      }

      return tree;
    } catch (error: any) {
      console.error('Fatal error in getFileTree:', error);
      throw error;
    }
  }
  
  async isRepoInitialized(): Promise<boolean> {
    try {
      const gitDir = path.join(this.repoPath, '.git');
      await fs.access(gitDir);
      return true;
    } catch {
      return false;
    }
  }

  async createTag(tagName: string, commitHash: string, message?: string): Promise<void> {
    const git = await this.ensureGit();
    const args = [tagName, commitHash];
    if (message) {
      args.push('-m', message);
    }
    await git.tag(args);
  }

  async listTags(): Promise<string[]> {
    const git = await this.ensureGit();
    const tags = await git.tags();
    return tags.all;
  }

  async deleteTag(tagName: string): Promise<void> {
    const git = await this.ensureGit();
    await git.tag(['-d', tagName]);
  }

  async getCurrentBranch(): Promise<string> {
    const git = await this.ensureGit();
    const branch = await git.branchLocal();
    return branch.current;
  }

  async getStatus(): Promise<any> {
    const git = await this.ensureGit();
    return await git.status();
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const fullPath = path.join(this.repoPath, filePath);
    const dirPath = path.dirname(fullPath);
    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(fullPath, content);
  }

  async readFile(filePath: string): Promise<string> {
    const fullPath = path.join(this.repoPath, filePath);
    return await fs.readFile(fullPath, 'utf-8');
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(this.repoPath, filePath);
    await fs.unlink(fullPath);
  }
}
