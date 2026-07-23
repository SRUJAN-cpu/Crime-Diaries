import { CurrentUser } from './AuthGate';
import { ChatView } from './ChatView';
import { Sidebar } from './Sidebar';
import { useChat } from '../hooks/useChat';

interface ChatAppProps {
  user: CurrentUser;
  onSignOut: () => void;
}

export function ChatApp({ user, onSignOut }: ChatAppProps) {
  const {
    sessions,
    activeSessionId,
    messages,
    isSending,
    isLoadingHistory,
    error,
    language,
    setLanguage,
    startNewChat,
    openSession,
    send,
    refetchSessions
  } = useChat();

  const handleRenameSession = async (sessionId: string, name: string) => {
    try {
      const response = await fetch(`/server/crime_diaries_function/sessions/${sessionId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to rename chat');
      }
      await refetchSessions();
    } catch (err) {
      console.error('Rename failed:', err);
      alert('Could not rename chat: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/server/crime_diaries_function/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to delete chat');
      }
      await refetchSessions();
      // If we deleted the currently active chat, reset to new chat
      if (activeSessionId === sessionId) {
        startNewChat();
      }
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Could not delete chat: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onNewChat={startNewChat}
        onSelectSession={openSession}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
        userLabel={user.first_name || user.email_id}
        onSignOut={onSignOut}
      />
      <ChatView
        messages={messages}
        isSending={isSending}
        isLoadingHistory={isLoadingHistory}
        error={error}
        onSend={send}
        userLabel={user.first_name || user.email_id}
        onSignOut={onSignOut}
        language={language}
        onSetLanguage={setLanguage}
      />
    </div>
  );
}
