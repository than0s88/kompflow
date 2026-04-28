import { useParams } from 'react-router-dom';
import ActivityFeed from '../components/activity/ActivityFeed';
import { useWorkspace } from '../hooks/useWorkspaces';

export default function WorkspaceActivity() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: workspace, isLoading } = useWorkspace(workspaceId);

  return (
    <div className="kf-page">
      <header className="kf-page__head">
        <div>
          <h1>Activity</h1>
          {!isLoading && workspace ? (
            <p className="kf-page__sub">
              <span className="kf-icon" aria-hidden>
                👥
              </span>{' '}
              Workspaces
            </p>
          ) : null}
          {!isLoading && workspace ? (
            <p className="kf-act__workspace-banner">
              {workspace.name}{' '}
              <span aria-hidden>
                {workspace.visibility === 'private' ? '🔒' : '🌐'}
              </span>
            </p>
          ) : null}
        </div>
      </header>

      <section className="kf-page__section">
        <h2 className="kf-page__section-title">
          <span className="kf-icon" aria-hidden>
            🕒
          </span>{' '}
          Activity
        </h2>
        <ActivityFeed scope="workspace" id={workspaceId} />
      </section>
    </div>
  );
}
