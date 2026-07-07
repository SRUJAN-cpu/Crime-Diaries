import { ChatMessage } from '../api/chatApi';

export function MessageBubble({ role, content }: ChatMessage) {
  const isUser = role === 'user';
  return (
    <div className={'message-row' + (isUser ? ' message-row-user' : ' message-row-assistant')}>
      {!isUser && <div className="message-avatar">CD</div>}
      <div className={'message-bubble' + (isUser ? ' message-bubble-user' : ' message-bubble-assistant')}>
        {content}
      </div>
    </div>
  );
}
