import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './auth/RequireAuth';
import AppShell from './components/layout/AppShell';
import BoardView from './pages/BoardView';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import WorkspaceActivity from './pages/WorkspaceActivity';
import WorkspaceView from './pages/WorkspaceView';

export default function App() {
  return (
    <Routes>
      {/* Public, full-bleed routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Authenticated routes — wrapped in AppShell (sidebar + main) */}
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/workspaces/:workspaceId" element={<WorkspaceView />} />
        <Route
          path="/workspaces/:workspaceId/activity"
          element={<WorkspaceActivity />}
        />
        <Route path="/boards/:boardId" element={<BoardView />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
