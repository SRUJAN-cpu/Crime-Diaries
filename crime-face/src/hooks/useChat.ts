import { useCallback, useEffect, useState } from 'react';
import {
  ChatMessage,
  ChatSession,
  Language,
  fetchHistory,
  fetchSessions,
  sendChatMessage
} from '../api/chatApi';

const LANGUAGE_STORAGE_KEY = 'crime-diaries-language';

function loadStoredLanguage(): Language {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored === 'kn' ? 'kn' : 'en';
}

export function useChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [language, setLanguageState] = useState<Language>(loadStoredLanguage);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
  }, []);

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
        const { session_id: sessionId, answer } = await sendChatMessage(
          trimmed,
          activeSessionId,
          language
        );
        setActiveSessionId(sessionId);
        setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
        loadSessions();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message');
      } finally {
        setIsSending(false);
      }
    },
    [activeSessionId, isSending, language, loadSessions]
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
    language,
    setLanguage,
    startNewChat,
    openSession,
    send,
    refetchSessions,
    isDeleting,
    setIsDeleting
  };
}
