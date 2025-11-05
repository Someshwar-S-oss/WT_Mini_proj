import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import MonacoEditor from '@monaco-editor/react';
import { useNotebook } from '../hooks/useNotebooks';
import { useBranches, useCheckoutBranch, useCreateBranch } from '../hooks/useBranches';
import { useFileTree, useCreateCommit } from '../hooks/useCommits';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export default function Editor() {
  const { id: notebookId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [selectedFile, setSelectedFile] = useState<string | null>(
    searchParams.get('file') || null
  );
  const [currentBranch, setCurrentBranch] = useState<string>(
    searchParams.get('branch') || 'main'
  );
  const [fileContent, setFileContent] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [showNewBranchDialog, setShowNewBranchDialog] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);

  const { data: notebookData } = useNotebook(notebookId!);
  const { data: branchesData } = useBranches(notebookId!);
  const { data: fileTree, refetch: refetchFileTree } = useFileTree(notebookId!, currentBranch);
  const checkoutBranch = useCheckoutBranch();
  const createBranch = useCreateBranch();
  const createCommit = useCreateCommit();

  const notebook = notebookData?.notebook;
  const branches = branchesData?.branches || [];

  // Load file content when file is selected
  useEffect(() => {
    if (selectedFile && notebookId) {
      api.getFileContent(notebookId, currentBranch, selectedFile)
        .then((data) => {
          setFileContent(data.content);
          setHasUnsavedChanges(false);
        })
        .catch((error) => {
          console.error('Failed to load file:', error);
          setFileContent('');
        });
    }
  }, [selectedFile, currentBranch, notebookId]);

  const handleEditorChange = (value: string | undefined) => {
    setFileContent(value || '');
    setHasUnsavedChanges(true);
  };

  const handleSaveFile = async () => {
    if (!selectedFile || !notebookId) return;

    try {
      await api.saveFile(notebookId, {
        branch: currentBranch,
        filePath: selectedFile,
        content: fileContent,
      });
      setHasUnsavedChanges(false);
      alert('File saved to working directory!');
    } catch (error) {
      console.error('Failed to save file:', error);
      alert('Failed to save file');
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim() || !notebookId) return;

    // Ensure we have a file to commit
    if (!selectedFile) {
      alert('Please select a file to commit');
      return;
    }

    try {
      // First save the current file if there are unsaved changes
      if (hasUnsavedChanges) {
        await api.saveFile(notebookId, {
          branch: currentBranch,
          filePath: selectedFile,
          content: fileContent,
        });
      }

      // Structure the files array properly with path and content
      const files = [{
        path: selectedFile,
        content: fileContent
      }];

      await createCommit.mutateAsync({
        notebookId,
        branch: currentBranch,
        message: commitMessage,
        files,
      });
      setCommitMessage('');
      setShowCommitDialog(false);
      setHasUnsavedChanges(false);
      refetchFileTree();
      alert('Commit created successfully!');
    } catch (error: any) {
      console.error('Failed to create commit:', error);
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to create commit';
      alert(errorMessage);
    }
  };

  const handleBranchChange = async (branchName: string) => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Do you want to switch branches anyway?')) {
        return;
      }
    }

    try {
      await checkoutBranch.mutateAsync({ notebookId: notebookId!, branchName });
      setCurrentBranch(branchName);
      setSearchParams({ branch: branchName });
      refetchFileTree();
    } catch (error) {
      console.error('Failed to checkout branch:', error);
      alert('Failed to switch branch');
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim() || !notebookId) return;

    try {
      await createBranch.mutateAsync({
        notebookId,
        branchName: newBranchName,
        sourceBranch: currentBranch,
      });
      setNewBranchName('');
      setShowNewBranchDialog(false);
      alert('Branch created successfully!');
    } catch (error) {
      console.error('Failed to create branch:', error);
      alert('Failed to create branch');
    }
  };

  const handleNewFile = async () => {
    if (!newFileName.trim() || !notebookId) return;

    try {
      await api.saveFile(notebookId, {
        branch: currentBranch,
        filePath: newFileName,
        content: '# New File\n\nStart editing...',
      });
      setNewFileName('');
      setShowNewFileDialog(false);
      setSelectedFile(newFileName);
      setFileContent('# New File\n\nStart editing...');
      refetchFileTree();
    } catch (error) {
      console.error('Failed to create file:', error);
      alert('Failed to create file');
    }
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedFolders.has(node.path);
      const paddingLeft = level * 16 + 12;
      const isSelected = selectedFile === node.path;

      if (node.type === 'directory') {
        return (
          <div key={node.path}>
            <div
              onClick={() => toggleFolder(node.path)}
              className="flex items-center py-2 px-2 hover:bg-accent rounded-md mx-2 cursor-pointer transition-colors group"
              style={{ paddingLeft: `${paddingLeft}px` }}
            >
              <svg className="w-4 h-4 mr-2 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path d={isExpanded ? "M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" : "M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"}/>
              </svg>
              <span className="text-sm text-foreground group-hover:text-primary transition-colors">{node.name}</span>
            </div>
            {isExpanded && node.children && (
              <div>{renderFileTree(node.children, level + 1)}</div>
            )}
          </div>
        );
      }

      return (
        <div
          key={node.path}
          onClick={() => {
            setSelectedFile(node.path);
            setSearchParams({ file: node.path, branch: currentBranch });
          }}
          className={`flex items-center py-2 px-2 rounded-md mx-2 cursor-pointer transition-all group ${
            isSelected 
              ? 'bg-primary/10 border-l-2 border-primary text-primary' 
              : 'hover:bg-accent text-muted-foreground hover:text-foreground'
          }`}
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span className="text-sm truncate">{node.name}</span>
        </div>
      );
    });
  };

  const getLanguageFromFile = (filePath: string | null): string => {
    if (!filePath) return 'plaintext';
    const ext = filePath.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      js: 'javascript',
      ts: 'typescript',
      jsx: 'javascript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      css: 'css',
      html: 'html',
      json: 'json',
      md: 'markdown',
      xml: 'xml',
      sql: 'sql',
      sh: 'shell',
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/notebook/${notebookId}`)}
            className="text-primary hover:text-primary/80 text-sm flex items-center gap-1 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="h-6 w-px bg-border"></div>
          <h1 className="text-lg font-semibold text-foreground">{notebook?.name}</h1>
          {selectedFile && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {selectedFile}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={currentBranch}
            onChange={(e) => handleBranchChange(e.target.value)}
            className="input h-9 text-sm min-w-[150px]"
          >
            {branches.map((branch: any) => (
              <option key={branch._id} value={branch.name}>
                🌿 {branch.name}
              </option>
            ))}
          </select>

          <Button
            onClick={() => setShowNewBranchDialog(true)}
            variant="secondary"
            size="sm"
          >
            + Branch
          </Button>

          {hasUnsavedChanges && (
            <Button
              onClick={handleSaveFile}
              size="sm"
              className="bg-success text-success-foreground hover:bg-success/90"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save
            </Button>
          )}

          <Button
            onClick={() => setShowCommitDialog(true)}
            size="sm"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Commit
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - File Tree */}
        <aside className="w-64 bg-card border-r border-border overflow-y-auto">
          <div className="p-3 border-b border-border flex justify-between items-center sticky top-0 bg-card">
            <span className="text-sm font-semibold text-foreground">Files</span>
            <button
              onClick={() => setShowNewFileDialog(true)}
              className="text-primary hover:text-primary/80 text-xl w-6 h-6 flex items-center justify-center rounded hover:bg-accent transition-colors"
              title="New File"
            >
              +
            </button>
          </div>
          <div className="py-2">
            {fileTree && fileTree.length > 0 ? (
              renderFileTree(fileTree)
            ) : (
              <div className="text-muted-foreground text-sm text-center py-12 px-4">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <p>No files yet</p>
                <p className="text-xs mt-1">Click + to create one</p>
              </div>
            )}
          </div>
        </aside>

        {/* Editor */}
        <main className="flex-1 bg-background">
          {selectedFile ? (
            <MonacoEditor
              height="100%"
              language={getLanguageFromFile(selectedFile)}
              value={fileContent}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                wordWrap: 'on',
                automaticLayout: true,
                fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
                fontLigatures: true,
                cursorBlinking: 'smooth',
                smoothScrolling: true,
                padding: { top: 16, bottom: 16 },
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <p className="text-lg mb-2 text-foreground">No file selected</p>
                <p className="text-sm">Select a file from the tree or create a new one</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Commit Dialog */}
      <Dialog open={showCommitDialog} onOpenChange={setShowCommitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Commit</DialogTitle>
            <DialogDescription>
              Create a new commit with your changes.
            </DialogDescription>
          </DialogHeader>
          {selectedFile && (
            <div className="p-3 bg-muted rounded-lg text-sm border border-border">
              <span className="font-medium text-muted-foreground">File to commit:</span>
              <div className="mt-1 text-foreground font-mono flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                {selectedFile}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="commitMessage">Commit Message</Label>
            <Textarea
              id="commitMessage"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Enter commit message... (e.g., 'Add new feature' or 'Update documentation')"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCommitDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCommit}
              disabled={!commitMessage.trim() || !selectedFile || createCommit.isPending}
            >
              {createCommit.isPending ? 'Committing...' : 'Commit Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Branch Dialog */}
      <Dialog open={showNewBranchDialog} onOpenChange={setShowNewBranchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Branch</DialogTitle>
            <DialogDescription>
              Create a new branch from {currentBranch}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="branchName">Branch Name</Label>
              <Input
                id="branchName"
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="Branch name..."
              />
            </div>
            <div className="p-3 bg-muted rounded-lg text-sm border border-border">
              <span className="text-muted-foreground">Will be created from:</span>
              <div className="mt-1 font-medium text-primary flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {currentBranch}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewBranchDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateBranch}
              disabled={!newBranchName.trim() || createBranch.isPending}
            >
              {createBranch.isPending ? 'Creating...' : 'Create Branch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New File Dialog */}
      <Dialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
            <DialogDescription>
              Create a new file in the current branch.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fileName">File Name</Label>
              <Input
                id="fileName"
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="File name (e.g., notes.md, chapter1.txt)"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              The file will be created in the current branch: <span className="text-primary font-medium">{currentBranch}</span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFileDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleNewFile}
              disabled={!newFileName.trim()}
            >
              Create File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
