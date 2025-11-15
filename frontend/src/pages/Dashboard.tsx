import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotebooks } from '../hooks/useNotebooks';
import { Notebook } from '../types';
import CreateNotebookModal from '../components/notebook/CreateNotebookModal.tsx';
import SearchBar from '../components/notebook/SearchBar';
import NotificationBell from '../components/common/NotificationBell';
import AlertDialog, { AlertType } from '../components/common/AlertDialog';
import ConfirmDialog from '../components/common/ConfirmDialog';
import PromptDialog from '../components/common/PromptDialog';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Star } from 'lucide-react';
import ContextMenu, { ContextMenuItem } from '../components/common/ContextMenu';
import api from '../services/api';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; notebook: Notebook } | null>(null);
  
  // Alert/Confirm/Prompt states
  const [alert, setAlert] = useState<{ isOpen: boolean; message: string; type: AlertType; title?: string }>({ 
    isOpen: false, message: '', type: 'info' 
  });
  const [confirm, setConfirm] = useState<{ isOpen: boolean; message: string; onConfirm: () => void; title?: string }>({ 
    isOpen: false, message: '', onConfirm: () => {} 
  });
  const [prompt, setPrompt] = useState<{ isOpen: boolean; message: string; defaultValue: string; onConfirm: (value: string) => void; title?: string }>({ 
    isOpen: false, message: '', defaultValue: '', onConfirm: () => {} 
  });

  const { data, isLoading, refetch } = useNotebooks();

  const notebooks: Notebook[] = data?.notebooks || [];

  const handleContextMenu = (e: React.MouseEvent, notebook: Notebook) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, notebook });
  };

  const handleRename = async (notebookId: string, newName: string) => {
    try {
      await api.updateNotebook(notebookId, { name: newName });
      refetch();
      setAlert({ isOpen: true, message: 'Notebook renamed successfully!', type: 'success' });
    } catch (error) {
      console.error('Failed to rename notebook:', error);
      setAlert({ isOpen: true, message: 'Failed to rename notebook', type: 'error' });
    }
  };

  const handleDelete = async (notebookId: string) => {
    setConfirm({
      isOpen: true,
      title: 'Delete Notebook',
      message: 'Are you sure you want to delete this notebook? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await api.deleteNotebook(notebookId);
          refetch();
          setAlert({ isOpen: true, message: 'Notebook deleted successfully!', type: 'success' });
        } catch (error) {
          console.error('Failed to delete notebook:', error);
          setAlert({ isOpen: true, message: 'Failed to delete notebook', type: 'error' });
        }
      }
    });
  };

  const handleDuplicate = async (notebookId: string) => {
    try {
      await api.forkNotebook(notebookId);
      refetch();
      setAlert({ isOpen: true, message: 'Notebook duplicated successfully!', type: 'success' });
    } catch (error) {
      console.error('Failed to duplicate notebook:', error);
      setAlert({ isOpen: true, message: 'Failed to duplicate notebook', type: 'error' });
    }
  };

  const getContextMenuItems = (notebook: Notebook): ContextMenuItem[] => {
    const ownerId = typeof notebook.owner === 'object' ? notebook.owner._id : notebook.owner;
    const isOwner = ownerId === user?._id;
    const collaborator = notebook.collaborators.find((c: any) => c.user._id === user?._id);
    const userRole = isOwner ? 'OWNER' : collaborator?.role;
    const canEdit = isOwner || userRole === 'EDITOR';

    return [
      {
        label: 'Open',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        ),
        onClick: () => navigate(`/notebook/${notebook._id}`),
      },
      {
        label: 'Read',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        ),
        onClick: () => navigate(`/notebook/${notebook._id}/reader`),
      },
      {
        label: 'Edit',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        ),
        onClick: () => navigate(`/notebook/${notebook._id}/editor`),
        disabled: !canEdit,
      },
      { separator: true, label: '', onClick: () => {} },
      {
        label: 'Rename',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        ),
        onClick: () => {
          setPrompt({
            isOpen: true,
            title: 'Rename Notebook',
            message: 'Enter new notebook name:',
            defaultValue: notebook.name,
            onConfirm: (newName) => {
              if (newName !== notebook.name) {
                handleRename(notebook._id, newName);
              }
            }
          });
        },
        disabled: !isOwner,
      },
      {
        label: 'Duplicate',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        ),
        onClick: () => handleDuplicate(notebook._id),
      },
      { separator: true, label: '', onClick: () => {} },
      {
        label: 'Delete',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        ),
        onClick: () => handleDelete(notebook._id),
        disabled: !isOwner,
        danger: true,
      },
    ];
  };

  const ownedNotebooks = notebooks.filter((n) => {
    const ownerId = typeof n.owner === 'object' ? n.owner._id : n.owner;
    return ownerId === user?._id;
  });
  const sharedNotebooks = notebooks.filter((n) => {
    const ownerId = typeof n.owner === 'object' ? n.owner._id : n.owner;
    return ownerId !== user?._id;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="border-b border-border bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-xl shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-purple-600 to-accent bg-clip-text text-transparent">
                  NoteVerse
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <SearchBar />
              <NotificationBell />
              <div className="h-8 w-px bg-border"></div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-sm">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-foreground">{user?.name}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={logout} className="text-destructive hover:text-destructive/80 hover:bg-destructive/10">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-4xl font-bold text-foreground mb-2">My Notebooks</h2>
              <p className="text-muted-foreground">Organize your notes, collaborate with others, and stay productive</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)} size="lg" className="shadow-lg hover:shadow-xl transition-shadow">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Notebook
            </Button>
          </div>

          {notebooks.length > 0 && (
            <div className="flex items-center gap-6 p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl border border-border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{notebooks.length}</p>
                  <p className="text-xs text-muted-foreground">Total Notebooks</p>
                </div>
              </div>
              <div className="h-12 w-px bg-border"></div>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{ownedNotebooks.length}</p>
                  <p className="text-xs text-muted-foreground">Owned</p>
                </div>
              </div>
              <div className="h-12 w-px bg-border"></div>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{sharedNotebooks.length}</p>
                  <p className="text-xs text-muted-foreground">Shared with me</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
              <p className="text-lg font-medium text-foreground">Loading notebooks...</p>
              <p className="text-sm text-muted-foreground mt-1">Please wait</p>
            </div>
          </div>
        ) : notebooks.length === 0 ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center max-w-md">
              <div className="inline-flex p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 mb-6">
                <svg className="w-16 h-16 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">No notebooks yet</h3>
              <p className="text-muted-foreground mb-6">Create your first notebook to start organizing your notes</p>
              <Button onClick={() => setShowCreateModal(true)} size="lg" className="shadow-lg">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create your first notebook
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notebooks.map((notebook) => {
              const ownerId = typeof notebook.owner === 'object' ? notebook.owner._id : notebook.owner;
              const isOwner = ownerId === user?._id;
              const isShared = !isOwner;

              return (
                <div key={notebook._id} onContextMenu={(e) => handleContextMenu(e, notebook)}>
                  <Link to={`/notebook/${notebook._id}`} className="group block">
                    <Card className="h-full hover:shadow-2xl hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <CardTitle className="group-hover:text-primary transition-colors text-lg line-clamp-1">
                              {notebook.name}
                            </CardTitle>
                            {isShared && (
                              <span className="inline-flex items-center gap-1 mt-2 text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                Shared
                              </span>
                            )}
                          </div>
                          <span className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${
                            notebook.isPublic 
                              ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}>
                            {notebook.isPublic ? (
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Public
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Private
                              </span>
                            )}
                          </span>
                        </div>
                        {notebook.description && (
                          <CardDescription className="line-clamp-2 text-sm mt-2">
                            {notebook.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="pb-3">
                        {notebook.courseName && (
                          <div className="flex items-center gap-2 text-sm px-3 py-2 bg-muted/50 rounded-lg">
                            <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <span className="text-muted-foreground font-medium truncate">{notebook.courseName}</span>
                            {notebook.courseCode && (
                              <span className="text-primary font-semibold flex-shrink-0">({notebook.courseCode})</span>
                            )}
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="border-t border-border bg-muted/20 pt-3">
                        <div className="w-full flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                              <span className="text-sm font-medium">{notebook.collaborators.length}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground hover:text-yellow-500 transition-colors">
                              <Star className="w-4 h-4" />
                              <span className="text-sm font-medium">{notebook.starCount || 0}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-primary group-hover:gap-2 transition-all">
                            <span className="text-xs font-medium">Open</span>
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </CardFooter>
                    </Card>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Notebook Modal */}
      <CreateNotebookModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems(contextMenu.notebook)}
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
        confirmText="Delete"
        variant="destructive"
      />

      <PromptDialog
        isOpen={prompt.isOpen}
        onClose={() => setPrompt({ ...prompt, isOpen: false })}
        onConfirm={prompt.onConfirm}
        message={prompt.message}
        defaultValue={prompt.defaultValue}
        title={prompt.title}
      />
    </div>
  );
}
