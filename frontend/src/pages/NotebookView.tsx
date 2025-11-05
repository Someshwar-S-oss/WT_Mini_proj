import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useNotebook } from '../hooks/useNotebooks';
import { useBranches, useCheckoutBranch } from '../hooks/useBranches';
import { useFileTree } from '../hooks/useCommits';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export default function NotebookView() {
  const { id: notebookId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));

  const { data: notebookData, isLoading: notebookLoading, error: notebookError } = useNotebook(notebookId!);
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

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedFolders.has(node.path);
      const paddingLeft = level * 16 + 8;

      if (node.type === 'directory') {
        return (
          <div key={node.path}>
            <div
              onClick={() => toggleFolder(node.path)}
              className="flex items-center py-1 px-2 hover:bg-gray-100 cursor-pointer"
              style={{ paddingLeft: `${paddingLeft}px` }}
            >
              <span className="mr-2 text-gray-500">
                {isExpanded ? '📂' : '📁'}
              </span>
              <span className="text-sm">{node.name}</span>
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
          onClick={() => navigate(`/notebook/${notebookId}/editor?file=${encodeURIComponent(node.path)}&branch=${selectedBranch}`)}
          className="flex items-center py-1 px-2 hover:bg-gray-100 cursor-pointer"
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          <span className="mr-2 text-gray-500">📄</span>
          <span className="text-sm">{node.name}</span>
        </div>
      );
    });
  };

  if (notebookLoading || branchesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading notebook...</div>
      </div>
    );
  }

  if (notebookError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">
          <p className="font-semibold mb-2">Error loading notebook</p>
          <p className="text-sm">{(notebookError as any)?.message || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  if (!notebook) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">
          <p className="font-semibold mb-2">Notebook not found</p>
          <p className="text-sm">notebookData: {JSON.stringify(notebookData)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <Link to="/" className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">{notebook.name}</h1>
              {notebook.description && (
                <p className="text-sm text-gray-600 mt-1">{notebook.description}</p>
              )}
              {notebook.courseName && (
                <p className="text-sm text-gray-500 mt-1">
                  {notebook.courseName} {notebook.courseCode && `(${notebook.courseCode})`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Branch Selector */}
              <select
                value={selectedBranch}
                onChange={(e) => handleBranchChange(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={checkoutBranch.isPending}
              >
                {branches.map((branch: any) => (
                  <option key={branch._id} value={branch.name}>
                    🌿 {branch.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => navigate(`/notebook/${notebookId}/commits`)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 text-sm"
              >
                📋 History
              </button>
              <button
                onClick={() => navigate(`/notebook/${notebookId}/editor?branch=${selectedBranch}`)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
              >
                ✏️ Open Editor
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* File Tree */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">Files</h2>
            {fileTreeLoading ? (
              <div className="text-gray-500 text-sm">Loading files...</div>
            ) : fileTree && fileTree.length > 0 ? (
              <div className="border border-gray-200 rounded-md overflow-hidden">
                {renderFileTree(fileTree)}
              </div>
            ) : (
              <div className="text-gray-500 text-sm text-center py-8">
                No files yet. Open the editor to create files.
              </div>
            )}
          </div>

          {/* Sidebar - Branches & Collaborators */}
          <div className="space-y-6">
            {/* Branches */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-4">Branches</h2>
              <div className="space-y-2">
                {branches.map((branch: any) => (
                  <div
                    key={branch._id}
                    className={`flex items-center justify-between p-2 rounded-md ${
                      branch.name === selectedBranch ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-sm flex items-center gap-2">
                      <span>🌿</span>
                      <span className={branch.name === selectedBranch ? 'font-medium text-blue-700' : ''}>
                        {branch.name}
                      </span>
                    </span>
                    {branch.name !== selectedBranch && (
                      <button
                        onClick={() => handleBranchChange(branch.name)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                        disabled={checkoutBranch.isPending}
                      >
                        Switch
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Collaborators */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-4">Collaborators</h2>
              <div className="space-y-2">
                {notebook.collaborators.length > 0 ? (
                  notebook.collaborators.map((collab: any) => (
                    <div key={collab.user} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{collab.user}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {collab.role}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No collaborators yet</p>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Visibility</span>
                  <span className="font-medium">{notebook.isPublic ? '🌐 Public' : '🔒 Private'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Branches</span>
                  <span className="font-medium">{branches.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Collaborators</span>
                  <span className="font-medium">{notebook.collaborators.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
