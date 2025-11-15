import { useState } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface Notebook {
  _id: string;
  name: string;
  description?: string;
  courseName?: string;
  courseCode?: string;
  owner: { username: string; name: string };
  starCount: number;
  viewCount: number;
}

export default function SearchBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [course, setCourse] = useState('');
  const [sort, setSort] = useState('relevance');
  const [results, setResults] = useState<Notebook[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!query.trim() && !course.trim()) return;

    setIsSearching(true);
    try {
      const data = await api.searchNotebooks(query, course, sort);
      setResults(data.notebooks || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="w-full md:w-64"
      >
        <Search className="w-4 h-4 mr-2" />
        Search notebooks...
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-20">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden border border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="flex items-center gap-3 p-6 border-b border-slate-200 dark:border-slate-800">
              <Search className="w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search notebooks by name, description, or course..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 border-0 focus-visible:ring-0 text-lg"
                autoFocus
              />
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <Filter className="w-4 h-4 text-slate-500" />
              <Input
                type="text"
                placeholder="Filter by course..."
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-48"
              />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              >
                <option value="relevance">Most Relevant</option>
                <option value="stars">Most Stars</option>
                <option value="views">Most Views</option>
                <option value="forks">Most Forks</option>
              </select>
              <Button onClick={handleSearch} size="sm" disabled={isSearching}>
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>

            {/* Results */}
            <div className="overflow-y-auto max-h-[500px] p-4">
              {isSearching ? (
                <div className="text-center py-12">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-500 border-r-transparent"></div>
                  <p className="mt-4 text-slate-500">Searching...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-3">
                  {results.map((notebook) => (
                    <button
                      key={notebook._id}
                      onClick={() => {
                        navigate(`/notebook/${notebook._id}`);
                        setIsOpen(false);
                      }}
                      className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-left"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                          {notebook.name}
                        </h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          ⭐ {notebook.starCount}
                        </span>
                      </div>
                      {notebook.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                          {notebook.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <span>By {notebook.owner.username}</span>
                        {notebook.courseName && <span>• {notebook.courseName}</span>}
                        <span>• {notebook.viewCount} views</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : query || course ? (
                <div className="text-center py-12">
                  <p className="text-slate-500">No notebooks found</p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                  <p className="text-slate-500">Start typing to search notebooks</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
