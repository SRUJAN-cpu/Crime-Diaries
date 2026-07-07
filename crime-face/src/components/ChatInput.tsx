import { KeyboardEvent, useState } from 'react';

interface ChatInputProps {
  disabled: boolean;
  onSend: (text: string) => void;
}

export function ChatInput({ disabled, onSend }: ChatInputProps) {
  const [text, setText] = useState('');

  const submit = () => {
    if (!text.trim() || disabled) {
      return;
    }
    onSend(text);
    setText('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="chat-input-bar">
      <div className="chat-input-box">
        <textarea
          className="chat-input-textarea"
          placeholder="Ask about a crime report, case, or statistic..."
          rows={1}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <button
          className="chat-send-button"
          onClick={submit}
          disabled={disabled || !text.trim()}
          aria-label="Send message"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
