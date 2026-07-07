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
    startNewChat,
    openSession,
    send
  } = useChat();

  return (
    <div className="app-shell">
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onNewChat={startNewChat}
        onSelectSession={openSession}
        userLabel={user.first_name || user.email_id}
        onSignOut={onSignOut}
      />
      <ChatView
        messages={messages}
        isSending={isSending}
        isLoadingHistory={isLoadingHistory}
        error={error}
        onSend={send}
      />
    </div>
  );
}
