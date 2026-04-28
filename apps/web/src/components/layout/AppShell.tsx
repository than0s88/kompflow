import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

/**
 * Two-column app layout: fixed left sidebar + scrollable main content.
 * Public pages (Home, Login, Register) render outside this shell.
 */
export default function AppShell() {
  return (
    <div className="kf-shell">
      <Sidebar />
      <main className="kf-shell__main">
        <Outlet />
      </main>
    </div>
  );
}
