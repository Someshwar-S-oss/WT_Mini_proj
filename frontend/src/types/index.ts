export interface User {
  _id: string;
  email: string;
  username: string;
  name: string;
  university?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Collaborator {
  user: User;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  addedAt: string;
}

export interface Notebook {
  _id: string;
  name: string;
  description?: string;
  courseName?: string;
  courseCode?: string;
  isPublic: boolean;
  gitRepoPath: string;
  owner: User;
  collaborators: Collaborator[];
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  _id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  notebook: string;
  lastCommitHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileChange {
  path: string;
  additions: number;
  deletions: number;
}

export interface Commit {
  _id: string;
  hash: string;
  message: string;
  description?: string;
  author: User;
  notebook: string;
  branch: Branch;
  parentHash?: string;
  filesChanged: FileChange[];
  additions: number;
  deletions: number;
  timestamp: string;
  createdAt: string;
}

export interface PullRequest {
  _id: string;
  title: string;
  description?: string;
  status: 'OPEN' | 'CLOSED' | 'MERGED';
  sourceBranch: Branch;
  targetBranch: Branch;
  notebook: string;
  author: User;
  mergedBy?: User;
  mergedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  content: string;
  author: User;
  commit?: string;
  pullRequest?: string;
  lineNumber?: number;
  filePath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  commitHash: string;
  notebook: string;
  createdAt: string;
}

export interface FileTreeItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeItem[];
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  name: string;
  university?: string;
}
