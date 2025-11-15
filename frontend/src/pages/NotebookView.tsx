import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotebook } from '../hooks/useNotebooks';
import { useBranches, useCheckoutBranch } from '../hooks/useBranches';
import { useFileTree } from '../hooks/useCommits';
import { ChevronLeft, GitBranch, History, Edit3, FolderOpen, FileText, Users, Eye, Lock, Globe, BookOpen, UserPlus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import AddCollaboratorModal from '../components/notebook/AddCollaboratorModal';
import ContextMenu, { ContextMenuItem } from '../components/common/ContextMenu';
import AlertDialog, { AlertType } from '../components/common/AlertDialog';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export default function NotebookView() {
  const { user } = useAuth();
  const { id: notebookId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));
  const [isAddCollaboratorOpen, setIsAddCollaboratorOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileNode } | null>(null);
  const [alert, setAlert] = useState<{ isOpen: boolean; message: string; type: AlertType; title?: string }>({ 
    isOpen: false, message: '', type: 'info' 
  });

  const { data: notebookData, isLoading: notebookLoading, error: notebookError, refetch: refetchNotebook } = useNotebook(notebookId!);
  const { data: branchesData, isLoading: branchesLoading } = useBranches(notebookId!);
  const { data: fileTree, isLoading: fileTreeLoading } = useFileTree(notebookId!, selectedBranch);
  const checkoutBranch = useCheckoutBranch();

  const notebook = notebookData?.notebook;
  const branches = branchesData?.branches || [];

  const handleBranchChange = async (branchName: string) => {
    try {
      await checkoutBranch.mutateAsync({ notebookId: notebookId!, branchName });
      setSelectedBranch(branchName);
    } catch (error) {
      console.error('Failed to checkout branch:', error);
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

  const handleContextMenu = (e: React.MouseEvent, file: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    if (file.type === 'file') {
      setContextMenu({ x: e.clientX, y: e.clientY, file });
    }
  };

  const getFileContextMenuItems = (file: FileNode): ContextMenuItem[] => {
    // Check user permissions
    const isOwner = notebook?.owner._id === user?._id;
    const collaborator = notebook?.collaborators.find((c: any) => c.user._id === user?._id);
    const userRole = isOwner ? 'OWNER' : collaborator?.role;
    const canEdit = isOwner || userRole === 'EDITOR';

    return [
      {
        label: 'Open in Reader',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        ),
        onClick: () => navigate(`/notebook/${notebookId}/reader?file=${encodeURIComponent(file.path)}&branch=${selectedBranch}`),
      },
      {
        label: 'Open in Editor',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        ),
        onClick: () => navigate(`/editor/${notebookId}?file=${encodeURIComponent(file.path)}&branch=${selectedBranch}`),
        disabled: !canEdit,
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
    ];
  };

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    if (level === 0) {
      // Root level - render as grid
      return (
        <div className="grid grid-cols-5 gap-4 p-6">
          {nodes.map((node) => {
            if (node.type === 'directory') {
              const isExpanded = expandedFolders.has(node.path);
              return (
                <div key={node.path} className="col-span-5">
                  <button
                    onClick={() => toggleFolder(node.path)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group"
                  >
                    <div className={`p-2 rounded-lg transition-all ${
                      isExpanded 
                        ? 'bg-indigo-100 dark:bg-indigo-950/50' 
                        : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950/50'
                    }`}>
                      <FolderOpen className={`w-5 h-5 transition-colors ${
                        isExpanded 
                          ? 'text-indigo-600 dark:text-indigo-400' 
                          : 'text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                      }`} />
                    </div>
                    <span className={`text-sm font-semibold transition-colors ${
                      isExpanded 
                        ? 'text-indigo-700 dark:text-indigo-300' 
                        : 'text-slate-700 dark:text-slate-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-300'
                    }`}>
                      {node.name}
                    </span>
                  </button>
                  {isExpanded && node.children && (
                    <div className="mt-3 grid grid-cols-5 gap-4">
                      {node.children.map((child) => (
                        <button
                          key={child.path}
                          onClick={() => navigate(`/notebook/${notebookId}/reader?file=${encodeURIComponent(child.path)}&branch=${selectedBranch}`)}
                          onContextMenu={(e) => handleContextMenu(e, child)}
                          className="flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-gradient-to-br hover:from-indigo-50 hover:to-blue-50 dark:hover:from-indigo-950/20 dark:hover:to-blue-950/20 border-2 border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-200 group cursor-pointer"
                        >
                          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 group-hover:from-indigo-100 group-hover:to-blue-100 dark:group-hover:from-indigo-950/50 dark:group-hover:to-blue-950/50 transition-all duration-200 shadow-sm group-hover:shadow-md">
                            <FileText className="w-8 h-8 text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200" />
                          </div>
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 text-center line-clamp-2 transition-colors duration-200">
                            {child.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            
            return (
              <button
                key={node.path}
                onClick={() => navigate(`/notebook/${notebookId}/reader?file=${encodeURIComponent(node.path)}&branch=${selectedBranch}`)}
                onContextMenu={(e) => handleContextMenu(e, node)}
                className="flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-gradient-to-br hover:from-indigo-50 hover:to-blue-50 dark:hover:from-indigo-950/20 dark:hover:to-blue-950/20 border-2 border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-200 group cursor-pointer"
              >
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 group-hover:from-indigo-100 group-hover:to-blue-100 dark:group-hover:from-indigo-950/50 dark:group-hover:to-blue-950/50 transition-all duration-200 shadow-sm group-hover:shadow-md">
                  <FileText className="w-8 h-8 text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200" />
                </div>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 text-center line-clamp-2 transition-colors duration-200">
                  {node.name}
                </span>
              </button>
            );
          })}
        </div>
      );
    }
    
    return null;
  };

  if (notebookLoading || branchesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading notebook...</p>
        </div>
      </div>
    );
  }

  if (notebookError) {
    const error = notebookError as any;
    const is403 = error?.response?.status === 403;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
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
                ? 'You do not have permission to view this notebook. It may be private or you may need to be added as a collaborator.'
                : error?.response?.data?.message || error?.message || 'An unexpected error occurred while loading the notebook.'}
            </p>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/dashboard')} variant="outline" className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              {is403 && (
                <Button onClick={() => navigate('/')} className="flex-1">
                  Go Home
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!notebook) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Notebook Not Found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">The requested notebook could not be found. It may have been deleted or the link is incorrect.</p>
            <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 sticky top-0 z-10 shadow-lg shadow-slate-200/20 dark:shadow-slate-950/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-start gap-8">
            <div className="space-y-2 flex-1">
              <Link 
                to="/" 
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center gap-1.5 transition-all font-medium group"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
                Back to Dashboard
              </Link>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-800 dark:from-slate-100 dark:via-indigo-200 dark:to-slate-300 bg-clip-text text-transparent leading-tight">
                  {notebook.name}
                </h1>
                {notebook.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl">{notebook.description}</p>
                )}
                {notebook.courseName && (
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-full">
                    <span className="text-lg">📚</span>
                    <span className="text-xs font-medium text-indigo-700 dark:text-indigo-400">
                      {notebook.courseName} {notebook.courseCode && `(${notebook.courseCode})`}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Branch Selector */}
              <div className="relative group">
                <GitBranch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <select
                  value={selectedBranch}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  className="pl-10 pr-8 py-2.5 min-w-[140px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-indigo-400 dark:hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer shadow-sm hover:shadow-md"
                  disabled={checkoutBranch.isPending}
                >
                  {branches.map((branch: any) => (
                    <option key={branch._id} value={branch.name}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                onClick={() => navigate(`/notebook/${notebookId}/commits`)}
                variant="outline"
                size="sm"
                className="shadow-sm hover:shadow-md transition-all"
              >
                <History className="w-4 h-4 mr-2" />
                History
              </Button>
              <Button
                onClick={() => navigate(`/notebook/${notebookId}/reader?branch=${selectedBranch}`)}
                variant="outline"
                size="sm"
                className="shadow-sm hover:shadow-md transition-all"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Read
              </Button>
              <Button
                onClick={() => navigate(`/notebook/${notebookId}/editor?branch=${selectedBranch}`)}
                size="sm"
                className="shadow-sm hover:shadow-md transition-all bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* File Tree */}
          <Card className="lg:col-span-2 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-transparent dark:from-slate-800/50 dark:via-indigo-950/20 py-4">
              <CardTitle className="flex items-center gap-2.5 text-lg">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950/50 rounded-lg">
                  <FolderOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent font-semibold">
                  Files
                </span>
                {fileTree && fileTree.length > 0 && (
                  <span className="ml-auto text-xs font-normal text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                    {fileTree.length} {fileTree.length === 1 ? 'item' : 'items'}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {fileTreeLoading ? (
                <div className="text-slate-500 dark:text-slate-400 text-sm text-center py-16">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-solid border-indigo-600 border-r-transparent mb-3"></div>
                  <p className="font-medium">Loading files...</p>
                </div>
              ) : fileTree && fileTree.length > 0 ? (
                <div>
                  {renderFileTree(fileTree)}
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 mb-4">
                    <FileText className="w-10 h-10 text-slate-400 dark:text-slate-600" />
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-base font-medium">No files yet</p>
                  <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">Open the editor to create your first file</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sidebar - Branches & Collaborators */}
          <div className="space-y-6">
            {/* Branches */}
            <Card className="shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 border-slate-200/50 dark:border-slate-800/50">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-transparent dark:from-slate-800/50 dark:via-indigo-950/20 py-4">
                <CardTitle className="flex items-center gap-2.5 text-base">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-950/50 rounded-lg">
                    <GitBranch className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className="bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent font-semibold">
                    Branches
                  </span>
                  <span className="ml-auto text-xs font-normal text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {branches.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {branches.map((branch: any) => (
                    <div
                      key={branch._id}
                      className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                        branch.name === selectedBranch 
                          ? 'bg-gradient-to-r from-indigo-50 to-indigo-100/50 dark:from-indigo-950/40 dark:to-indigo-950/20 border-2 border-indigo-300 dark:border-indigo-700 shadow-sm' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                      }`}
                    >
                      <span className="text-sm flex items-center gap-2.5">
                        <GitBranch className={`w-4 h-4 ${branch.name === selectedBranch ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                        <span className={branch.name === selectedBranch ? 'font-bold text-indigo-700 dark:text-indigo-300' : 'font-medium text-slate-700 dark:text-slate-300'}>
                          {branch.name}
                        </span>
                        {branch.name === selectedBranch && (
                          <span className="ml-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded">
                            ACTIVE
                          </span>
                        )}
                      </span>
                      {branch.name !== selectedBranch && (
                        <Button
                          onClick={() => handleBranchChange(branch.name)}
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-700 dark:hover:text-indigo-300"
                          disabled={checkoutBranch.isPending}
                        >
                          Switch
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Collaborators */}
            <Card className="shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 border-slate-200/50 dark:border-slate-800/50">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-transparent dark:from-slate-800/50 dark:via-indigo-950/20 py-4">
                <CardTitle className="flex items-center gap-2.5 text-base">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-950/50 rounded-lg">
                    <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className="bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent font-semibold">
                    Collaborators
                  </span>
                  <span className="ml-auto text-xs font-normal text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {notebook.collaborators.length}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => setIsAddCollaboratorOpen(true)}
                    className="h-7 w-7 p-0 ml-2"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {notebook.collaborators.length > 0 ? (
                    notebook.collaborators.map((collab: any, index: number) => (
                      <div key={collab.user} className="flex items-center justify-between text-sm p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-200 group">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                            index % 5 === 0 ? 'bg-gradient-to-br from-indigo-500 to-indigo-600' :
                            index % 5 === 1 ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
                            index % 5 === 2 ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                            index % 5 === 3 ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' :
                            'bg-gradient-to-br from-amber-500 to-amber-600'
                          }`}>
                            {(typeof collab.user === 'object' ? collab.user.username : collab.user).charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                            {typeof collab.user === 'object' ? collab.user.username : collab.user}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 uppercase tracking-wide">
                          {collab.role}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 mb-3">
                        <Users className="w-7 h-7 text-slate-400 dark:text-slate-600" />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No collaborators yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 border-slate-200/50 dark:border-slate-800/50">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-transparent dark:from-slate-800/50 dark:via-indigo-950/20 py-4">
                <CardTitle className="flex items-center gap-2.5 text-base">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-950/50 rounded-lg">
                    <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className="bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent font-semibold">
                    Quick Stats
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-200 group">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300">Visibility</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      {notebook.isPublic ? (
                        <>
                          <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950/50 rounded-lg">
                            <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <span className="text-sm">Public</span>
                        </>
                      ) : (
                        <>
                          <div className="p-1.5 bg-amber-100 dark:bg-amber-950/50 rounded-lg">
                            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <span className="text-sm">Private</span>
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-200 group">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300">Branches</span>
                    <span className="font-bold text-lg text-slate-900 dark:text-slate-100">{branches.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-200 group">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300">Collaborators</span>
                    <span className="font-bold text-lg text-slate-900 dark:text-slate-100">{notebook.collaborators.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Add Collaborator Modal */}
      <AddCollaboratorModal
        isOpen={isAddCollaboratorOpen}
        onClose={() => setIsAddCollaboratorOpen(false)}
        notebookId={notebookId!}
        onSuccess={() => refetchNotebook()}
      />

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
    </div>
  );
}
