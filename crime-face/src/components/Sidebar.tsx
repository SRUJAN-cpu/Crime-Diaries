import { ChatSession } from '../api/chatApi';
import { useState } from 'react';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId?: string;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, name: string) => void;
  onDeleteSession: (sessionId: string) => void;
  userLabel: string;
  onSignOut: () => void;
}

export function Sidebar({
  sessions,
  activeSessionId,
  onNewChat,
  onSelectSession,
  onRenameSession,
  onDeleteSession,
  userLabel,
  onSignOut
}: SidebarProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [sessionIdForMenu, setSessionIdForMenu] = useState<string | null>(null);

  // Custom modal states
  const [renameSessionId, setRenameSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, sessionId: string) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSessionIdForMenu(sessionId);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSessionIdForMenu(null);
  };

  const handleRenameClick = () => {
    if (!sessionIdForMenu) return;
    const session = sessions.find((s) => s.session_id === sessionIdForMenu);
    setRenameSessionId(sessionIdForMenu);
    setRenameValue(session?.displayName || session?.last_message || 'New Chat');
    handleCloseMenu();
  };

  const handleDeleteClick = () => {
    if (!sessionIdForMenu) return;
    setDeleteSessionId(sessionIdForMenu);
    handleCloseMenu();
  };

  return (
    <>
      <aside className="w-[280px] h-screen fixed left-0 top-0 flex flex-col border-r border-outline-variant bg-surface-container-low z-50 bottom-0 select-none font-body text-on-surface">
        <div className="p-6 flex flex-col flex-1 min-h-0">
          {/* Brand Header */}
          <div className="flex items-center gap-3 mb-8">
            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: '"FILL" 1' }}>
              security
            </span>
            <div>
              <h1 className="font-headline text-xl font-bold text-primary">Crime Diaries</h1>
              <p className="text-xs text-on-surface-variant font-label">Active Duty: Level 4</p>
            </div>
          </div>

          {/* New Investigation Button */}
          <button
            onClick={onNewChat}
            className="w-full py-3 px-4 bg-primary text-on-primary rounded-lg font-label flex items-center justify-center gap-2 hover:opacity-90 transition-all duration-200 mb-6 shadow-sm text-sm"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Investigation
          </button>

          {/* Navigation Lists */}
          <div className="space-y-6 overflow-y-auto flex-1 pr-1 custom-scrollbar">
            {/* Pinned Chats Section */}
            <div>
              <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-3 px-4">
                Pinned Chats
              </h3>
              <div className="space-y-1">
                <a
                  className="flex items-center gap-3 px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors group"
                  href="#election-security"
                  onClick={(e) => e.preventDefault()}
                >
                  <span className="material-symbols-outlined text-lg">push_pin</span>
                  <span className="truncate">Election Security</span>
                </a>
                <a
                  className="flex items-center gap-3 px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors group"
                  href="#high-profile"
                  onClick={(e) => e.preventDefault()}
                >
                  <span className="material-symbols-outlined text-lg">push_pin</span>
                  <span className="truncate">High-Profile Case</span>
                </a>
              </div>
            </div>

            {/* Recent Investigations Section */}
            <div>
              <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-3 px-4">
                Recent Investigations
              </h3>
              <div className="space-y-1 relative">
                {sessions.length === 0 && (
                  <p className="text-xs text-on-surface-variant/60 px-4 py-2 italic">
                    No past chats yet
                  </p>
                )}
                {sessions.map((session) => {
                  const isActive = session.session_id === activeSessionId;
                  return (
                    <div
                      key={session.session_id}
                      onClick={() => onSelectSession(session.session_id)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors group cursor-pointer ${
                        isActive
                          ? 'text-primary font-bold border-l-4 border-primary bg-primary-fixed rounded-r-lg'
                          : 'text-sm text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {isActive ? 'chat_bubble' : 'history'}
                      </span>
                      <span className="truncate flex-1">
                        {session.displayName || session.last_message || 'New Chat'}
                      </span>
                      <button
                        aria-label="More options"
                        onClick={(e) => handleOpenMenu(e, session.session_id)}
                        className="p-1 hover:bg-surface-container-highest rounded transition-colors group-hover:block hidden"
                      >
                        <span className="material-symbols-outlined text-sm">more_vert</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Floating Settings/Options menu */}
        {anchorEl && sessionIdForMenu && (
          <div
            className="absolute bg-surface border border-outline-variant rounded-lg p-1.5 shadow-lg z-[999] min-w-[120px] text-sm font-label text-on-surface"
            style={{
              top: anchorEl.getBoundingClientRect().bottom + window.scrollY + 4,
              left: Math.max(16, anchorEl.getBoundingClientRect().left + window.scrollX - 80),
            }}
            onMouseLeave={handleCloseMenu}
          >
            <button
              onClick={handleRenameClick}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface-container-high rounded text-left"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Rename
            </button>
            <button
              onClick={handleDeleteClick}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface-container-high hover:text-error rounded text-left text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              Delete
            </button>
          </div>
        )}

        {/* Sidebar Footer */}
        <div className="mt-auto p-6 space-y-1 border-t border-outline-variant">
          <a
            className="flex items-center gap-3 px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-lg"
            href="#settings"
            onClick={(e) => e.preventDefault()}
          >
            <span className="material-symbols-outlined text-lg">settings</span>
            System Settings
          </a>
          <a
            className="flex items-center gap-3 px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-lg"
            href="#audit"
            onClick={(e) => e.preventDefault()}
          >
            <span className="material-symbols-outlined text-lg">receipt_long</span>
            Audit Logs
          </a>
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-error transition-colors rounded-lg text-left"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Sign Out
          </button>

          {/* User Card */}
          <div className="flex items-center gap-3 pt-4 px-4 border-t border-outline-variant/30 mt-2">
            <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden border border-outline-variant">
              <img
                alt={userLabel}
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBcQBX2BcUQL8rIMESSk6tenXKk4FUjnzFwpbQxCCkneVxFMDgnav_Sdg0UWvG40Rod9BDVSN3mGj1vE_atOaDOvR4RWAfDWxpTBTalFCSCGelM_ubQJv1Tcs7TvqKGzkB5KZQROUQWcKI1Sf557ppYe39LwPdJwxc7er4q3PeUuMwjXd3A8PfMDWm5pqilSUcPADY5AlELxSg38MrmfrtyQWl9vJgHijWNn1ypj1vM5YvLCaZ-4IV7K4siY9oxOaQ9PgppJk5888nu"
              />
            </div>
            <div className="overflow-hidden">
              <p className="font-label text-sm font-bold truncate text-on-surface">{userLabel}</p>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">ID: 99283-KA</p>
            </div>
          </div>
        </div>
      </aside>

      {/* RENAME INVESTIGATION DIALOG OVERLAY (Sahara Theme) */}
      {renameSessionId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-[4px] animate-in fade-in duration-300">
          <section className="bg-surface w-full max-w-md rounded-lg shadow-2xl border border-outline-variant overflow-hidden transform transition-all duration-300 scale-100 text-on-surface font-body">
            {/* Header */}
            <div className="px-6 pt-6 pb-2">
              <h2 className="text-2xl font-bold tracking-tight font-headline">Rename Investigation</h2>
              <p className="text-sm text-on-surface-variant mt-1 font-medium">Update the identifier for this case file.</p>
            </div>
            {/* Body */}
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest px-1" htmlFor="investigation-name">
                    Current Name
                  </label>
                  <div className="relative">
                    <input
                      className="w-full h-12 bg-white border border-outline-variant rounded-lg px-4 text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                      id="investigation-name"
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && renameValue.trim()) {
                          onRenameSession(renameSessionId, renameValue.trim());
                          setRenameSessionId(null);
                        }
                      }}
                      autoFocus
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline-variant">edit</span>
                  </div>
                </div>
                <div className="p-3 bg-surface-container-high rounded-lg flex gap-3 items-start">
                  <span className="material-symbols-outlined text-primary text-sm mt-0.5" style={{ fontVariationSettings: '"FILL" 1' }}>info</span>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    Renaming will update all associated audit logs and internal tracking markers. This action is recorded in the system history.
                  </p>
                </div>
              </div>
            </div>
            {/* Footer */}
            <div className="px-6 py-5 bg-surface-dim flex justify-end items-center gap-3">
              <button
                type="button"
                onClick={() => setRenameSessionId(null)}
                className="px-5 py-2.5 rounded-full border border-outline text-on-surface font-semibold text-sm hover:bg-surface-variant transition-colors active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!renameValue.trim()}
                onClick={() => {
                  onRenameSession(renameSessionId, renameValue.trim());
                  setRenameSessionId(null);
                }}
                className="px-7 py-2.5 rounded-full bg-primary text-on-primary font-bold text-sm shadow-md hover:bg-[#B38713] transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                <span>Rename</span>
                <span className="material-symbols-outlined text-sm font-bold">check</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {/* DELETE INVESTIGATION DIALOG OVERLAY (Sahara Theme) */}
      {deleteSessionId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-[4px] animate-in fade-in duration-300">
          <div className="relative w-[400px] bg-surface rounded-lg shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200 text-on-surface font-body">
            {/* Top error accent strip */}
            <div className="h-1 bg-error"></div>
            <div className="p-6">
              {/* Title */}
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center mr-4">
                  <span className="material-symbols-outlined text-error text-xl" style={{ fontVariationSettings: '"FILL" 1' }}>warning</span>
                </div>
                <h2 className="text-xl font-bold tracking-tight font-headline">Delete Investigation</h2>
              </div>
              {/* Warning message */}
              <p className="text-on-surface-variant text-sm leading-relaxed mb-8">
                Are you sure you want to permanently delete this investigation? This action cannot be undone.
              </p>
              {/* Buttons */}
              <div className="flex justify-end items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setDeleteSessionId(null)}
                  className="px-5 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container rounded-lg border border-outline-variant transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteSession(deleteSessionId);
                    setDeleteSessionId(null);
                  }}
                  className="px-6 py-2 text-sm font-bold bg-error text-on-error hover:opacity-90 shadow-md rounded-lg transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm font-bold">delete</span>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
