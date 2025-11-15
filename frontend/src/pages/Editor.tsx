import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import MonacoEditor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';
import { useNotebook } from '../hooks/useNotebooks';
import { useBranches, useCheckoutBranch, useCreateBranch } from '../hooks/useBranches';
import { useFileTree, useCreateCommit } from '../hooks/useCommits';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { ChevronLeft, Lock } from 'lucide-react';
import MarkdownToolbar from '../components/common/MarkdownToolbar';
import ContextMenu, { ContextMenuItem } from '../components/common/ContextMenu';
import AlertDialog, { AlertType } from '../components/common/AlertDialog';
import ConfirmDialog from '../components/common/ConfirmDialog';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export default function Editor() {
  const { user } = useAuth();
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
  const editorRef = useRef<any>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileNode } | null>(null);

  // Alert/Confirm states
  const [alert, setAlert] = useState<{ isOpen: boolean; message: string; type: AlertType; title?: string }>({ 
    isOpen: false, message: '', type: 'info' 
  });
  const [confirm, setConfirm] = useState<{ isOpen: boolean; message: string; onConfirm: () => void; title?: string }>({ 
    isOpen: false, message: '', onConfirm: () => {} 
  });

  const { data: notebookData, isLoading: notebookLoading, error: notebookError } = useNotebook(notebookId!);
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

  const handleMarkdownInsert = (text: string, cursorOffset: number = 0) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const selection = editor.getSelection();
    const position = selection.getPosition();

    // Insert text at cursor position
    editor.executeEdits('', [
      {
        range: selection,
        text: text,
        forceMoveMarkers: true,
      },
    ]);

    // Move cursor to the specified position
    const newPosition = {
      lineNumber: position.lineNumber,
      column: position.column + text.length + cursorOffset,
    };
    editor.setPosition(newPosition);
    editor.focus();

    // Update content
    setFileContent(editor.getValue());
    setHasUnsavedChanges(true);
  };

  const handleContextMenu = (e: React.MouseEvent, file: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    if (file.type === 'file') {
      setContextMenu({ x: e.clientX, y: e.clientY, file });
    }
  };

  const getFileContextMenuItems = (file: FileNode): ContextMenuItem[] => {
    const isCurrentFile = selectedFile === file.path;
    
    return [
      {
        label: 'Open',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        ),
        onClick: () => {
          setSelectedFile(file.path);
          setSearchParams({ file: file.path, branch: currentBranch });
        },
        disabled: isCurrentFile,
      },
      {
        label: 'View in Reader',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        ),
        onClick: () => navigate(`/notebook/${notebookId}/reader?file=${encodeURIComponent(file.path)}&branch=${currentBranch}`),
      },
      { separator: true, label: '', onClick: () => {} },
      {
        label: 'Copy Path',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        ),
        onClick: () => {
          navigator.clipboard.writeText(file.path);
          setAlert({ isOpen: true, message: 'Path copied to clipboard!', type: 'success' });
        },
      },
      {
        label: 'Copy Filename',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        onClick: () => {
          navigator.clipboard.writeText(file.name);
          setAlert({ isOpen: true, message: 'Filename copied to clipboard!', type: 'success' });
        },
      },
    ];
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
      setAlert({ isOpen: true, message: 'File saved to working directory!', type: 'success' });
    } catch (error) {
      console.error('Failed to save file:', error);
      setAlert({ isOpen: true, message: 'Failed to save file', type: 'error' });
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim() || !notebookId) return;

    // Ensure we have a file to commit
    if (!selectedFile) {
      setAlert({ isOpen: true, message: 'Please select a file to commit', type: 'warning' });
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
      setAlert({ isOpen: true, message: 'Commit created successfully!', type: 'success' });
    } catch (error: any) {
      console.error('Failed to create commit:', error);
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to create commit';
      setAlert({ isOpen: true, message: errorMessage, type: 'error' });
    }
  };

  const handleBranchChange = async (branchName: string) => {
    if (hasUnsavedChanges) {
      setConfirm({
        isOpen: true,
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Do you want to switch branches anyway?',
        onConfirm: async () => {
          try {
            await checkoutBranch.mutateAsync({ notebookId: notebookId!, branchName });
            setCurrentBranch(branchName);
            setSearchParams({ branch: branchName });
            refetchFileTree();
          } catch (error) {
            console.error('Failed to checkout branch:', error);
            setAlert({ isOpen: true, message: 'Failed to switch branch', type: 'error' });
          }
        }
      });
      return;
    }

    try {
      await checkoutBranch.mutateAsync({ notebookId: notebookId!, branchName });
      setCurrentBranch(branchName);
      setSearchParams({ branch: branchName });
      refetchFileTree();
    } catch (error) {
      console.error('Failed to checkout branch:', error);
      setAlert({ isOpen: true, message: 'Failed to switch branch', type: 'error' });
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
      setAlert({ isOpen: true, message: 'Branch created successfully!', type: 'success' });
    } catch (error) {
      console.error('Failed to create branch:', error);
      setAlert({ isOpen: true, message: 'Failed to create branch', type: 'error' });
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
      setAlert({ isOpen: true, message: 'Failed to create file', type: 'error' });
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
          onContextMenu={(e) => handleContextMenu(e, node)}
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

  // Error handling
  if (notebookError) {
    const error = notebookError as any;
    const is403 = error?.response?.status === 403;
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              {is403 ? (
                <>
                  <Lock className="w-5 h-5" />
                  Access Denied
                </>
              ) : (
                'Error Loading Notebook'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {is403 
                ? 'You do not have permission to edit this notebook. You may need editor access.'
                : error?.response?.data?.message || error?.message || 'An unexpected error occurred.'}
            </p>
            <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (notebookLoading || !notebook) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
          <p className="text-muted-foreground">Loading notebook...</p>
        </div>
      </div>
    );
  }

  // Check if user has editor permissions
  const isOwner = notebook.owner._id === user?._id;
  const collaborator = notebook.collaborators.find((c: any) => c.user._id === user?._id);
  const userRole = isOwner ? 'OWNER' : collaborator?.role;
  const canEdit = isOwner || userRole === 'EDITOR';

  if (!canEdit) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Editor Access Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You need editor permissions to modify this notebook. You currently have <span className="font-semibold text-foreground">{userRole || 'no'}</span> access.
            </p>
            <p className="text-sm text-muted-foreground">
              Contact the notebook owner to request editor access, or use the reader mode to view files.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => navigate(`/notebook/${notebookId}`)} variant="outline" className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Notebook
              </Button>
              <Button onClick={() => navigate(`/notebook/${notebookId}/reader`)} className="flex-1">
                Open Reader
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <h1 className="text-lg font-semibold text-foreground">{notebook.name}</h1>
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
          <div className="relative">
            <select
              value={currentBranch}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="h-9 text-sm min-w-[180px] pl-9 pr-8 appearance-none cursor-pointer bg-card text-foreground border border-border rounded-md hover:bg-accent transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              {branches.map((branch: any) => (
                <option key={branch._id} value={branch.name}>
                  {branch.name}
                </option>
              ))}
            </select>
            <svg 
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            <svg 
              className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <Button
            onClick={() => setShowNewBranchDialog(true)}
            variant="secondary"
            size="sm"
            className="flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Branch
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
        <main className="flex-1 bg-background flex flex-col">
          {selectedFile ? (
            <>
              {getLanguageFromFile(selectedFile) === 'markdown' && (
                <MarkdownToolbar
                  onInsert={handleMarkdownInsert}
                  disabled={!selectedFile}
                />
              )}
              <div className="flex-1">
                <MonacoEditor
                  height="100%"
                  language={getLanguageFromFile(selectedFile)}
                  value={fileContent}
                  onChange={handleEditorChange}
                  onMount={(editor) => {
                    editorRef.current = editor;
                  }}
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
              </div>
            </>
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

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getFileContextMenuItems(contextMenu.file)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Custom Dialogs */}
      <AlertDialog
        isOpen={alert.isOpen}
        onClose={() => setAlert({ ...alert, isOpen: false })}
        message={alert.message}
        type={alert.type}
        title={alert.title}
      />

      <ConfirmDialog
        isOpen={confirm.isOpen}
        onClose={() => setConfirm({ ...confirm, isOpen: false })}
        onConfirm={confirm.onConfirm}
        message={confirm.message}
        title={confirm.title}
        confirmText="Switch Branch"
        variant="default"
      />
    </div>
  );
}
