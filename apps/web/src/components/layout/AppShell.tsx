import { Outlet } from 'react-router-dom';
import { useSidebarCollapsed } from '../../lib/sidebar-state';
import { ToastProvider } from '../toast/ToastProvider';
import ProfileMenu from './ProfileMenu';
import Sidebar from './Sidebar';
import WorkspaceNotifier from './WorkspaceNotifier';

/**
 * Two-column app layout: fixed left sidebar + scrollable main content.
 * Public pages (Home, Login, Register) render outside this shell.
 */
export default function AppShell() {
  const [collapsed, setCollapsed] = useSidebarCollapsed();

  return (
    <ToastProvider>
      <div
        className={
          'kf-shell' + (collapsed ? ' is-sidebar-collapsed' : '')
        }
      >
        <Sidebar />
        <main className="kf-shell__main">
          {collapsed ? (
            <button
              type="button"
              className="kf-sidebar-show"
              onClick={() => setCollapsed(false)}
              aria-label="Show sidebar"
              title="Show sidebar"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          ) : null}
          <ProfileMenu />
          <Outlet />
        </main>
      </div>
      <WorkspaceNotifier />
    </ToastProvider>
  );
}
