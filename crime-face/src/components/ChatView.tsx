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
    <main className="ml-[280px] flex flex-col min-h-screen bg-background text-on-surface select-none">
      {/* Top App Bar */}
      <header className="flex justify-between items-center w-full px-6 h-16 sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant">
        <div className="flex items-center gap-8">
          <span className="font-headline text-xl font-black text-primary">Crime Diaries</span>
          {/* TODO: Uncomment when implementing Dashboard, Analytics, Maps */}
          {/* <nav className="hidden md:flex gap-6">
            <a
              className="text-primary border-b-2 border-primary pb-1 font-label text-sm font-bold"
              href="#dashboard"
              onClick={(e) => e.preventDefault()}
            >
              Dashboard
            </a>
            <a
              className="text-on-surface-variant hover:text-primary transition-colors font-label text-sm font-medium"
              href="#analytics"
              onClick={(e) => e.preventDefault()}
            >
              Analytics
            </a>
            <a
              className="text-on-surface-variant hover:text-primary transition-colors font-label text-sm font-medium"
              href="#maps"
              onClick={(e) => e.preventDefault()}
            >
              Maps
            </a>
          </nav> */}
        </div>

        {/* Right Header actions */}
        <div className="flex items-center gap-4">
          {/* TODO: Uncomment when implementing global search */}
          {/* <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-outline text-lg">search</span>
            <input
              type="text"
              placeholder="Global search..."
              className="bg-surface-container-high border-none rounded-full pl-10 pr-4 py-1.5 text-sm w-60 focus:ring-1 focus:ring-primary focus:outline-none placeholder-on-surface-variant/60"
            />
          </div> */}
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-outline-variant font-label text-xs hover:bg-surface-container transition-colors font-semibold">
            <span className="material-symbols-outlined text-sm">language</span>
            Kannada / EN
          </button>
          <div className="flex gap-1">
            <button className="w-9 h-9 flex items-center justify-center hover:bg-surface-container rounded-full transition-transform active:scale-90 text-on-surface-variant">
              <span className="material-symbols-outlined text-xl">notifications</span>
            </button>
            <button className="w-9 h-9 flex items-center justify-center hover:bg-surface-container rounded-full transition-transform active:scale-90 text-on-surface-variant">
              <span className="material-symbols-outlined text-xl">account_circle</span>
            </button>
          </div>
        </div>
      </header>

      {/* Chat Messages Canvas */}
      <section className="flex-1 overflow-y-auto pb-36 pt-4">
        <div className="w-full px-6">
          {/* Empty State */}
          {messages.length === 0 && !isLoadingHistory && (
            <div className="flex flex-col items-center justify-center text-center mt-[12vh] max-w-md mx-auto space-y-4">
              <span className="material-symbols-outlined text-primary text-6xl" style={{ fontVariationSettings: '"FILL" 1' }}>
                security
              </span>
              <h1 className="font-headline text-2xl font-bold text-on-surface">Crime Diaries Portal</h1>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Start an investigation by querying gang networks, mapping hotspots, or viewing local FIR analysis in Bangalore.
              </p>
              <div className="flex flex-wrap gap-2 justify-center pt-2">
                <button
                  onClick={() => onSend('Who are the current gang leaders active in the Bangalore North division?')}
                  className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-xs font-semibold rounded-full border border-outline-variant transition-colors"
                >
                  Show Active Gang Leaders
                </button>
                <button
                  onClick={() => onSend('Show me a geographic distribution of their recent activities.')}
                  className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-xs font-semibold rounded-full border border-outline-variant transition-colors"
                >
                  Map Geographic Hotspots
                </button>
                <button
                  onClick={() => onSend('Generate a network diagram showing the connections between Rajesh Kumar and known associates.')}
                  className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-xs font-semibold rounded-full border border-outline-variant transition-colors"
                >
                  Link Analysis Chart
                </button>
              </div>
            </div>
          )}

          {/* Loading History */}
          {isLoadingHistory && (
            <div className="flex items-center justify-center gap-2 py-8 text-on-surface-variant text-sm font-medium">
              <span className="animate-spin material-symbols-outlined">sync</span>
              Loading investigation logs...
            </div>
          )}

          {/* Messages List */}
          <div className="space-y-4">
            {messages.map((message, index) => (
              <MessageBubble key={index} role={message.role} content={message.content} />
            ))}
          </div>

          {/* Typing Indicator */}
          {isSending && (
            <div className="flex justify-start gap-4 max-w-[90%] mx-auto mb-6 mt-4">
              <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-on-primary text-sm" style={{ fontVariationSettings: '"FILL" 1' }}>
                  security
                </span>
              </div>
              <div className="max-w-[85%] flex-1">
                <div className="agent-bubble bg-surface p-4 rounded-lg rounded-tl-none border border-outline-variant inline-block">
                  <div className="flex gap-1.5 items-center justify-center py-1">
                    <div className="w-2 h-2 rounded-full bg-outline animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-outline animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-outline animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="max-w-[90%] mx-auto mt-4 p-4 rounded-lg bg-error-container text-on-error-container border border-error/20 text-sm font-medium flex items-center gap-3">
              <span className="material-symbols-outlined text-error">warning</span>
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </section>

      {/* Sticky Bottom Input Box */}
      <footer className="fixed bottom-0 left-[280px] right-0 z-40 pb-6 px-6 bg-gradient-to-t from-background via-background/90 to-transparent">
        <div className="w-full pt-2">
          <ChatInput disabled={isSending} onSend={onSend} />
        </div>
      </footer>
    </main>
  );
}
