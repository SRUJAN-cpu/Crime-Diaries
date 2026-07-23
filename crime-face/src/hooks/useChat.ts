import { useCallback, useEffect, useState } from 'react';
import {
  ChatMessage,
  ChatSession,
  fetchHistory,
  fetchSessions,
  sendChatMessage
} from '../api/chatApi';

export function useChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const result = await fetchSessions();
      setSessions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load past chats');
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const startNewChat = useCallback(() => {
    setActiveSessionId(undefined);
    setMessages([]);
    setError(null);
  }, []);

  const openSession = useCallback(async (sessionId: string) => {
    setError(null);
    setIsLoadingHistory(true);
    setActiveSessionId(sessionId);
    try {
      const history = await fetchHistory(sessionId);
      setMessages(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load that chat');
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) {
        return;
      }

      setError(null);
      setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
      setIsSending(true);

      try {
        const { session_id: sessionId, answer } = await sendChatMessage(trimmed, activeSessionId);
        setActiveSessionId(sessionId);
        setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
        loadSessions();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message');
      } finally {
        setIsSending(false);
      }
    },
    [activeSessionId, isSending, loadSessions]
  );

  const refetchSessions = useCallback(async () => {
    await loadSessions();
  }, [loadSessions]);

  return {
    sessions,
    activeSessionId,
    messages,
    isSending,
    isLoadingHistory,
    error,
    startNewChat,
    openSession,
    send,
    refetchSessions
  };
}
