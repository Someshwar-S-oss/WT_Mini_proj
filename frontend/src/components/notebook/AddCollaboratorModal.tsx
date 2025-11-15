import { useState } from 'react';
import { X, Search, UserPlus, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import AlertDialog, { AlertType } from '../common/AlertDialog';

interface AddCollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  notebookId: string;
  onSuccess: () => void;
}

export default function AddCollaboratorModal({
  isOpen,
  onClose,
  notebookId,
  onSuccess,
}: AddCollaboratorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'VIEWER' | 'EDITOR'>('VIEWER');
  const [alert, setAlert] = useState<{ isOpen: boolean; message: string; type: AlertType; title?: string }>({ 
    isOpen: false, message: '', type: 'info' 
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `http://localhost:5000/api/users/search?username=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      } else {
        console.error('Failed to search users');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddCollaborator = async (userId: string) => {
    setIsAdding(true);
    try {
      const response = await fetch(
        `http://localhost:5000/api/notebooks/${notebookId}/collaborators`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            userId,
            role: selectedRole,
          }),
        }
      );

      if (response.ok) {
        onSuccess();
        setSearchQuery('');
        setSearchResults([]);
        setAlert({ isOpen: true, message: 'Collaborator added successfully!', type: 'success' });
        setTimeout(() => onClose(), 1500);
      } else {
        const error = await response.json();
        setAlert({ isOpen: true, message: error.message || 'Failed to add collaborator', type: 'error' });
      }
    } catch (error) {
      console.error('Error adding collaborator:', error);
      setAlert({ isOpen: true, message: 'Failed to add collaborator', type: 'error' });
    } finally {
      setIsAdding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-800/50">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              Add Collaborator
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Search and invite users to collaborate on this notebook
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
          {/* Search Section */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="search" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                Search by Username
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="search"
                    type="text"
                    placeholder="Enter username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10"
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="min-w-[100px]"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    'Search'
                  )}
                </Button>
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                Role
              </Label>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedRole('VIEWER')}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                    selectedRole === 'VIEWER'
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="text-sm font-semibold">Viewer</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Can read files</div>
                </button>
                <button
                  onClick={() => setSelectedRole('EDITOR')}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                    selectedRole === 'EDITOR'
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="text-sm font-semibold">Editor</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Can read and edit</div>
                </button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  Search Results ({searchResults.length})
                </h3>
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {user.username}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleAddCollaborator(user._id)}
                        disabled={isAdding}
                        size="sm"
                      >
                        {isAdding ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchQuery && searchResults.length === 0 && !isSearching && (
              <div className="text-center py-8">
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  No users found matching "{searchQuery}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>

      {/* Custom Dialog */}
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
