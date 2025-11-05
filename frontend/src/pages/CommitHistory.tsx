import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useNotebook } from '../hooks/useNotebooks';
import { useBranches } from '../hooks/useBranches';
import { useCommits, useCommitDiff } from '../hooks/useCommits';
import { ChevronLeft, GitBranch, Edit3, FileText, Clock, User, Hash, FolderOpen, Plus, Minus } from 'lucide-react';

interface Commit {
  hash: string;
  message: string;
  author: string | {
    _id: string;
    name?: string;
    username: string;
    email: string;
  };
  timestamp?: string;
  date?: string;
  filesChanged?: Array<{ path: string; additions: number; deletions: number }>;
  files?: string[];
}

export default function CommitHistory() {
  const { id: notebookId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);

  const { data: notebookData } = useNotebook(notebookId!);
  const notebook = notebookData?.notebook;
  const { data: branchesData } = useBranches(notebookId!);
  const { data: commitsData, isLoading } = useCommits(notebookId!, selectedBranch);
  const { data: diffData } = useCommitDiff(notebookId!, selectedCommit || '');

  const branches = branchesData?.branches || [];
  const commits: Commit[] = commitsData?.commits || [];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getAuthorInitials = (author: Commit['author']) => {
    if (typeof author === 'string') return author.charAt(0).toUpperCase();
    const name = author?.name || author?.username || '?';
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  const getAuthorName = (author: Commit['author']) => {
    if (typeof author === 'string') return author;
    return author?.name || author?.username || 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Enhanced Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <Link
                to={`/notebook/${notebookId}`}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center gap-1.5 transition-colors font-medium group"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                Back to Notebook
              </Link>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                {notebook?.name || 'Notebook'}
                <span className="text-slate-400 dark:text-slate-500 text-lg ml-3 font-normal">/ Commit History</span>
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <GitBranch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer appearance-none"
                >
                  {branches.map((branch: any) => (
                    <option key={branch._id} value={branch.name}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => navigate(`/notebook/${notebookId}/editor?branch=${selectedBranch}`)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium inline-flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
              >
                <Edit3 className="w-4 h-4" />
                Open Editor
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Commit Timeline */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-800/50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Commit Timeline
                </h2>
                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{commits.length} commits</span>
              </div>
            </div>
            
            <div className="p-6">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
                  <p className="mt-4 text-slate-500 dark:text-slate-400 text-sm">Loading commits...</p>
                </div>
              ) : commits.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-slate-400 dark:text-slate-600 opacity-50" />
                  <p className="text-slate-500 dark:text-slate-400 text-sm">No commits yet</p>
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Make your first commit in the editor!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {commits.map((commit, index) => (
                    <div
                      key={commit.hash}
                      onClick={() => setSelectedCommit(commit.hash)}
                      className={`relative border rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                        selectedCommit === commit.hash
                          ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 shadow-md scale-[1.02]'
                          : 'border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:shadow-sm'
                      }`}
                    >
                      {/* Timeline connector */}
                      {index !== commits.length - 1 && (
                        <div className="absolute left-[30px] top-[60px] w-0.5 h-8 bg-gradient-to-b from-slate-300 dark:from-slate-700 to-transparent" />
                      )}
                      
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shadow-lg transition-all ${
                              index === 0 
                                ? 'bg-gradient-to-br from-indigo-500 to-purple-600' 
                                : selectedCommit === commit.hash
                                ? 'bg-gradient-to-br from-indigo-400 to-purple-500'
                                : 'bg-gradient-to-br from-slate-400 to-slate-500 dark:from-slate-600 dark:to-slate-700'
                            }`}
                          >
                            {getAuthorInitials(commit.author)}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2 leading-tight">
                            {commit.message}
                          </p>
                          
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mb-3">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5" />
                              <span className="font-medium">{getAuthorName(commit.author)}</span>
                            </div>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{formatDate(commit.date || commit.timestamp || '')}</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                              <Hash className="w-3 h-3" />
                              <span className="text-xs font-mono font-medium">{commit.hash.substring(0, 7)}</span>
                            </div>
                            
                            {commit.filesChanged && commit.filesChanged.length > 0 && (
                              <>
                                <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                                  <Plus className="w-3 h-3" />
                                  <span className="text-xs font-semibold">
                                    {commit.filesChanged.reduce((sum, f) => sum + f.additions, 0)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 px-2.5 py-1 rounded-md border border-rose-200 dark:border-rose-800">
                                  <Minus className="w-3 h-3" />
                                  <span className="text-xs font-semibold">
                                    {commit.filesChanged.reduce((sum, f) => sum + f.deletions, 0)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                  <FileText className="w-3 h-3" />
                                  <span className="text-xs font-medium">
                                    {commit.filesChanged.length} file{commit.filesChanged.length > 1 ? 's' : ''}
                                  </span>
                                </div>
                              </>
                            )}
                            {!commit.filesChanged && ((commit.files?.length || 0) > 0) && (
                              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                <FileText className="w-3 h-3" />
                                <span className="text-xs font-medium">
                                  {commit.files?.length} file{(commit.files?.length || 0) > 1 ? 's' : ''}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Diff Viewer */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-800/50">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Changes
              </h2>
            </div>
            
            <div className="p-6">
              {!selectedCommit ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-2xl flex items-center justify-center mb-4">
                    <FileText className="w-10 h-10 text-indigo-400 dark:text-indigo-500" />
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 font-medium mb-1">No commit selected</p>
                  <p className="text-slate-400 dark:text-slate-500 text-sm">Click on a commit to view its changes</p>
                </div>
              ) : diffData ? (
                <div className="space-y-4">
                  {diffData.files && diffData.files.length > 0 ? (
                    diffData.files.map((file: any, idx: number) => (
                      <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{file.path || file.name || `File ${idx + 1}`}</span>
                          </div>
                          {file.additions !== undefined && file.deletions !== undefined && (
                            <div className="flex items-center gap-3 text-xs">
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                <Plus className="w-3 h-3" />
                                {file.additions}
                              </span>
                              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                                <Minus className="w-3 h-3" />
                                {file.deletions}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="bg-slate-900 dark:bg-slate-950 p-4 overflow-x-auto">
                          {file.diff ? (
                            <pre className="text-xs font-mono leading-relaxed">
                              {file.diff.split('\n').map((line: string, lineIdx: number) => (
                                <div
                                  key={lineIdx}
                                  className={`${
                                    line.startsWith('+')
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : line.startsWith('-')
                                      ? 'bg-rose-500/20 text-rose-300'
                                      : line.startsWith('@@')
                                      ? 'text-cyan-400 font-semibold'
                                      : 'text-slate-300'
                                  } px-2 py-0.5`}
                                >
                                  {line || ' '}
                                </div>
                              ))}
                            </pre>
                          ) : (
                            <p className="text-sm text-slate-400">No diff available</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                      No file changes in this commit
                    </div>
                  )}
                  {diffData.diff && !diffData.files?.length && (
                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      <div className="bg-slate-900 dark:bg-slate-950 p-4 overflow-x-auto">
                        <pre className="text-xs font-mono leading-relaxed text-slate-300 whitespace-pre-wrap">
                          {diffData.diff}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-500 dark:text-slate-400 text-sm text-center py-8">
                  Loading diff...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
