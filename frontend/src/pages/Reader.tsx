import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useNotebook } from '../hooks/useNotebooks';
import { useBranches } from '../hooks/useBranches';
import { useFileTree } from '../hooks/useCommits';
import { 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  Type, 
  List, 
  Search,
  Printer,
  Download,
  Moon,
  Sun,
  Menu,
  X,
  FileText,
  FolderOpen,
  Edit3,
  ZoomIn,
  ZoomOut,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import ContextMenu, { ContextMenuItem } from '../components/common/ContextMenu';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export default function Reader() {
  const { id: notebookId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedFile = searchParams.get('file') || '';
  const selectedBranch = searchParams.get('branch') || 'main';

  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [fontSize, setFontSize] = useState(16);
  const [darkMode, setDarkMode] = useState(false);
  const [tableOfContents, setTableOfContents] = useState<Array<{ level: number; text: string; id: string }>>([]);
  const [copied, setCopied] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileNode | null } | null>(null);

  const { data: notebookData } = useNotebook(notebookId!);
  const { data: branchesData } = useBranches(notebookId!);
  const { data: fileTree } = useFileTree(notebookId!, selectedBranch);

  const notebook = notebookData?.notebook;
  const branches = branchesData?.branches || [];

  // Load file content
  useEffect(() => {
    const loadFile = async () => {
      if (!selectedFile || !notebookId) return;

      setLoading(true);
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await fetch(
          `${API_URL}/notebooks/${notebookId}/file?path=${encodeURIComponent(selectedFile)}&branch=${selectedBranch}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        console.log('Response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('Loaded content:', data.content?.substring(0, 200));
          setContent(data.content || '');
        } else {
          console.error('Failed to load file:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error loading file:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFile();
  }, [selectedFile, notebookId, selectedBranch]);

  // Extract table of contents from markdown
  useEffect(() => {
    const headings: Array<{ level: number; text: string; id: string }> = [];
    const lines = content.split('\n');
    
    lines.forEach((line) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        const id = text.toLowerCase().replace(/[^\w]+/g, '-');
        headings.push({ level, text, id });
      }
    });
    
    setTableOfContents(headings);
  }, [content]);

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

  const handleFileSelect = (path: string) => {
    setSearchParams({ file: path, branch: selectedBranch });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.split('/').pop() || 'document.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const increaseFontSize = () => setFontSize((prev) => Math.min(prev + 2, 24));
  const decreaseFontSize = () => setFontSize((prev) => Math.max(prev - 2, 12));

  const handleContextMenu = (e: React.MouseEvent, file: FileNode | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (file && file.type === 'file') {
      setContextMenu({ x: e.clientX, y: e.clientY, file });
    } else if (!file && selectedFile) {
      // Context menu on content area
      setContextMenu({ x: e.clientX, y: e.clientY, file: null });
    }
  };

  const getContextMenuItems = (): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [];

    if (contextMenu?.file) {
      // File context menu
      items.push(
        {
          label: 'Open',
          icon: (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          onClick: () => handleFileSelect(contextMenu.file!.path),
        },
        {
          label: 'Edit in Editor',
          icon: (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          ),
          onClick: () => navigate(`/editor/${notebookId}?file=${encodeURIComponent(contextMenu.file!.path)}&branch=${selectedBranch}`),
        }
      );
    }

    // Common actions for both file and content area
    if (selectedFile) {
      if (items.length > 0) {
        items.push({ separator: true, label: '', onClick: () => {} });
      }

      items.push(
        {
          label: 'Copy Content',
          icon: <Copy className="w-4 h-4" />,
          onClick: () => handleCopyContent(),
        },
        {
          label: 'Download',
          icon: <Download className="w-4 h-4" />,
          onClick: () => handleDownload(),
        },
        {
          label: 'Print',
          icon: <Printer className="w-4 h-4" />,
          onClick: () => window.print(),
        }
      );
    }

    return items;
  };

  const renderFileTree = (nodes: FileNode[], level = 0): JSX.Element[] => {
    return nodes.map((node) => {
      const isExpanded = expandedFolders.has(node.path);
      const isSelected = node.path === selectedFile;
      const paddingLeft = level * 16 + 12;

      if (node.type === 'directory') {
        return (
          <div key={node.path}>
            <div
              onClick={() => toggleFolder(node.path)}
              className="flex items-center py-2 px-3 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              style={{ paddingLeft: `${paddingLeft}px` }}
            >
              <FolderOpen className={`mr-2 w-4 h-4 ${isExpanded ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{node.name}</span>
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
          onClick={() => handleFileSelect(node.path)}
          onContextMenu={(e) => handleContextMenu(e, node)}
          className={`flex items-center py-2 px-3 cursor-pointer transition-colors ${
            isSelected
              ? 'bg-indigo-100 dark:bg-indigo-950/30 border-l-4 border-indigo-600 dark:border-indigo-400'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 border-l-4 border-transparent'
          }`}
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          <FileText className={`mr-2 w-4 h-4 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
          <span className={`text-sm ${isSelected ? 'font-semibold text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
            {node.name}
          </span>
        </div>
      );
    });
  };

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!notebook) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 shadow-sm print:hidden">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
              <Link 
                to={`/notebook/${notebookId}`}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center gap-1.5 transition-colors font-medium"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Notebook
              </Link>
              <div className="h-6 w-px bg-slate-300 dark:bg-slate-700"></div>
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Reader Mode</h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Font Size Controls */}
              <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={decreaseFontSize}
                  className="h-7 w-7 p-0"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400 min-w-[32px] text-center">
                  {fontSize}px
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={increaseFontSize}
                  className="h-7 w-7 p-0"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Dark Mode Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDarkMode(!darkMode)}
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>

              {/* Copy Content */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyContent}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>

              {/* Print */}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
              >
                <Printer className="w-4 h-4" />
              </Button>

              {/* Download */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4" />
              </Button>

              {/* Edit Mode */}
              <Button
                size="sm"
                onClick={() => navigate(`/notebook/${notebookId}/editor?file=${encodeURIComponent(selectedFile)}&branch=${selectedBranch}`)}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {/* Sidebar - File Tree */}
        {sidebarOpen && (
          <aside className="w-72 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-r border-slate-200 dark:border-slate-800 h-[calc(100vh-73px)] overflow-y-auto sticky top-[73px] print:hidden shadow-lg">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <List className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Files
              </h2>
              {fileTree && fileTree.length > 0 ? (
                <div>{renderFileTree(fileTree)}</div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No files</p>
              )}
            </div>

            {/* Table of Contents */}
            {tableOfContents.length > 0 && (
              <div className="p-4">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <List className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Table of Contents
                </h2>
                <div className="space-y-1">
                  {tableOfContents.map((heading, index) => (
                    <button
                      key={index}
                      onClick={() => scrollToHeading(heading.id)}
                      className="block w-full text-left py-1.5 px-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                      style={{ paddingLeft: `${(heading.level - 1) * 12 + 8}px` }}
                    >
                      {heading.text}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-73px)] px-4 py-6 lg:px-8 lg:py-8">
          <div className="max-w-5xl mx-auto h-full">
            {loading ? (
              <div className="flex items-center justify-center h-[calc(100vh-150px)]">
                <div className="text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent mb-4"></div>
                  <p className="text-slate-600 dark:text-slate-400">Loading content...</p>
                </div>
              </div>
            ) : selectedFile ? (
              <div 
                className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-800/50 p-6 lg:p-12 min-h-[calc(100vh-150px)]"
                onContextMenu={(e) => handleContextMenu(e, null)}
              >
                {content ? (
                  <article 
                    className="prose prose-slate dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-headings:font-bold prose-h1:text-4xl prose-h1:mb-6 prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3 prose-p:mb-4 prose-p:leading-relaxed prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline prose-code:text-indigo-600 dark:prose-code:text-indigo-400 prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-900 dark:prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800 prose-li:my-1 prose-ul:my-4 prose-ol:my-4"
                    style={{ fontSize: `${fontSize}px` }}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw, rehypeHighlight]}
                      components={{
                        h1: ({ node, ...props }) => (
                          <h1 id={props.children?.toString().toLowerCase().replace(/[^\w]+/g, '-')} {...props} />
                        ),
                        h2: ({ node, ...props }) => (
                          <h2 id={props.children?.toString().toLowerCase().replace(/[^\w]+/g, '-')} {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3 id={props.children?.toString().toLowerCase().replace(/[^\w]+/g, '-')} {...props} />
                        ),
                        h4: ({ node, ...props }) => (
                          <h4 id={props.children?.toString().toLowerCase().replace(/[^\w]+/g, '-')} {...props} />
                        ),
                        h5: ({ node, ...props }) => (
                          <h5 id={props.children?.toString().toLowerCase().replace(/[^\w]+/g, '-')} {...props} />
                        ),
                        h6: ({ node, ...props }) => (
                          <h6 id={props.children?.toString().toLowerCase().replace(/[^\w]+/g, '-')} {...props} />
                        ),
                      }}
                    >
                      {content}
                    </ReactMarkdown>
                  </article>
                ) : (
                  <div className="flex items-center justify-center h-[calc(100vh-250px)]">
                    <div className="text-center">
                      <FileText className="w-20 h-20 mx-auto mb-4 text-slate-400 dark:text-slate-600 opacity-50" />
                      <p className="text-slate-600 dark:text-slate-400 font-medium">No content to display</p>
                      <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">The file appears to be empty or could not be loaded.</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[calc(100vh-150px)]">
                <div className="text-center">
                  <BookOpen className="w-24 h-24 mx-auto mb-6 text-indigo-400 dark:text-indigo-600 opacity-80" />
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-3">
                    Welcome to Reader Mode
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    Select a file from the sidebar to start reading
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          body {
            background: white !important;
          }
          article {
            font-size: 12pt !important;
          }
        }
      `}</style>
    </div>
  );
}
