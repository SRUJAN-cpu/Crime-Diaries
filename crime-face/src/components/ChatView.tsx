import { useEffect, useRef } from 'react';
import { ChatMessage } from '../api/chatApi';
import { ChatInput } from './ChatInput';
import { MessageBubble } from './MessageBubble';

interface ChatViewProps {
  messages: ChatMessage[];
  isSending: boolean;
  isLoadingHistory: boolean;
  error: string | null;
  onSend: (text: string) => void;
}

export function ChatView({ messages, isSending, isLoadingHistory, error, onSend }: ChatViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  return (
    <main className="chat-view">
      <div className="chat-scroll">
        {messages.length === 0 && !isLoadingHistory && (
          <div className="chat-empty-state">
            <h1>Crime Diaries</h1>
            <p>Ask a question about crime data, or just say hi.</p>
          </div>
        )}

        {isLoadingHistory && <p className="chat-status">Loading chat...</p>}

        {messages.map((message, index) => (
          <MessageBubble key={index} role={message.role} content={message.content} />
        ))}

        {isSending && (
          <div className="message-row message-row-assistant">
            <div className="message-avatar">CD</div>
            <div className="message-bubble message-bubble-assistant message-bubble-typing">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        {error && <p className="chat-error">{error}</p>}

        <div ref={bottomRef} />
      </div>

      <ChatInput disabled={isSending} onSend={onSend} />
    </main>
  );
}
