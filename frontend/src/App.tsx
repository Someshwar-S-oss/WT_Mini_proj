import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import Dashboard from './pages/Dashboard.tsx';
import NotebookView from './pages/NotebookView.tsx';
import Editor from './pages/Editor.tsx';
import CommitHistory from './pages/CommitHistory.tsx';
import Reader from './pages/Reader.tsx';

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />}
      />
      <Route
        path="/dashboard"
        element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
      />
      <Route
        path="/notebook/:id"
        element={isAuthenticated ? <NotebookView /> : <Navigate to="/login" />}
      />
      <Route
        path="/notebook/:id/editor"
        element={isAuthenticated ? <Editor /> : <Navigate to="/login" />}
      />
      <Route
        path="/notebook/:id/commits"
        element={isAuthenticated ? <CommitHistory /> : <Navigate to="/login" />}
      />
      <Route
        path="/notebook/:id/reader"
        element={isAuthenticated ? <Reader /> : <Navigate to="/login" />}
      />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default App;
