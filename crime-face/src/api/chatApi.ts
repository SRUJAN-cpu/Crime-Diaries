// Client for the crime_diaries_function backend (functions/crime_diaries_function).
// Requests ride on the Catalyst embedded-auth session cookie, so every call
// uses credentials: 'include'.

const BASE_URL = '/server/crime_diaries_function';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  updated_at?: string;
  session_id?: string;
  source?: 'llm' | 'rag';
}

export interface ChatSession {
  session_id: string;
  message_count: number;
  last_message_time: number;
  last_message: string;
}

async function parseJsonOrThrow(response: Response): Promise<any> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (data && data.error) || `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return data;
}

export async function sendChatMessage(
  message: string,
  sessionId?: string
): Promise<{ session_id: string; answer: string }> {
  const response = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId })
  });
  return parseJsonOrThrow(response);
}

export async function fetchSessions(): Promise<ChatSession[]> {
  const response = await fetch(`${BASE_URL}/sessions`, { credentials: 'include' });
  const data = await parseJsonOrThrow(response);
  return data.sessions;
}

export async function fetchHistory(sessionId: string): Promise<ChatMessage[]> {
  const response = await fetch(
    `${BASE_URL}/history?session_id=${encodeURIComponent(sessionId)}`,
    { credentials: 'include' }
  );
  const data = await parseJsonOrThrow(response);
  return data.messages;
}
