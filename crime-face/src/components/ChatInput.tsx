import { KeyboardEvent, useState, useRef } from 'react';

interface ChatInputProps {
  disabled: boolean;
  onSend: (text: string) => void;
}

export function ChatInput({ disabled, onSend }: ChatInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    if (!text.trim() || disabled) {
      return;
    }
    onSend(text);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  return (
    <div className="relative flex items-center bg-surface/95 backdrop-blur-md border border-outline-variant rounded-lg p-2 shadow-lg w-full">
      {/* Action Icons */}
      <div className="flex items-center gap-0.5 px-1">
        <button
          type="button"
          disabled={disabled}
          title="Attach file (visual only)"
          className="w-9 h-9 flex items-center justify-center text-on-surface-variant hover:bg-surface-container rounded-full transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-xl">attach_file</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          title="Voice input (visual only)"
          className="w-9 h-9 flex items-center justify-center text-on-surface-variant hover:bg-surface-container rounded-full transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-xl">mic</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          title="Database query (visual only)"
          className="w-9 h-9 flex items-center justify-center text-on-surface-variant hover:bg-surface-container rounded-full transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-xl">database</span>
        </button>
      </div>

      {/* Input Text Area */}
      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-body py-2 px-3 placeholder-on-surface-variant/60 resize-none max-h-32 focus:outline-none focus:border-none focus:shadow-none"
        placeholder="Ask about criminal records, hotspots, or link analysis..."
      />

      {/* Send Button */}
      <div className="px-1">
        <button
          onClick={submit}
          disabled={disabled || !text.trim()}
          className="w-9 h-9 bg-primary text-on-primary flex items-center justify-center rounded-lg hover:opacity-90 transition-all active:scale-95 shadow-sm disabled:bg-outline/30 disabled:text-on-surface-variant/50"
          aria-label="Send message"
        >
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
