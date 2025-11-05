import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotebooks } from '../hooks/useNotebooks';
import { Notebook } from '../types';
import CreateNotebookModal from '../components/notebook/CreateNotebookModal.tsx';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading } = useNotebooks();

  const notebooks: Notebook[] = data?.notebooks || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            NoteVerse
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, <span className="font-medium text-foreground">{user?.name}</span>
            </span>
            <Button variant="ghost" size="sm" onClick={logout} className="text-destructive hover:text-destructive/80">
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-semibold text-foreground">My Notebooks</h2>
          <Button onClick={() => setShowCreateModal(true)}>
            + Create Notebook
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading notebooks...</p>
          </div>
        ) : notebooks.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-block p-4 rounded-full bg-muted mb-4">
              <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-muted-foreground mb-4">No notebooks yet</p>
            <Button onClick={() => setShowCreateModal(true)}>
              Create your first notebook
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notebooks.map((notebook) => (
              <Link key={notebook._id} to={`/notebook/${notebook._id}`} className="group">
                <Card className="hover:shadow-xl hover:border-primary/50 transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="group-hover:text-primary transition-colors">
                        {notebook.name}
                      </CardTitle>
                      <span className={`text-xs px-2 py-1 rounded-full ${notebook.isPublic ? 'bg-success/20 text-success' : 'bg-secondary text-secondary-foreground'}`}>
                        {notebook.isPublic ? 'Public' : 'Private'}
                      </span>
                    </div>
                    {notebook.description && (
                      <CardDescription className="line-clamp-2">{notebook.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {notebook.courseName && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span>{notebook.courseName}</span>
                        {notebook.courseCode && <span className="text-primary">({notebook.courseCode})</span>}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="border-t border-border">
                    <div className="w-full flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span>{notebook.collaborators.length} collaborators</span>
                      </div>
                      <svg className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Create Notebook Modal */}
      <CreateNotebookModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
