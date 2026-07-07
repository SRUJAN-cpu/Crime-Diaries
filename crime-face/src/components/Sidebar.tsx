import { ChatSession } from '../api/chatApi';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId?: string;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  userLabel: string;
  onSignOut: () => void;
}

export function Sidebar({
  sessions,
  activeSessionId,
  onNewChat,
  onSelectSession,
  userLabel,
  onSignOut
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <button className="new-chat-button" onClick={onNewChat}>
        + New chat
      </button>
      <div className="session-list">
        {sessions.length === 0 && <p className="session-list-empty">No past chats yet</p>}
        {sessions.map((session) => (
          <button
            key={session.session_id}
            className={
              'session-item' + (session.session_id === activeSessionId ? ' session-item-active' : '')
            }
            onClick={() => onSelectSession(session.session_id)}
          >
            <span className="session-item-preview">{session.last_message || 'New conversation'}</span>
          </button>
        ))}
      </div>
      <div className="sidebar-footer">
        <span className="sidebar-user">{userLabel}</span>
        <button className="sidebar-signout" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
