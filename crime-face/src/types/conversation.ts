export type MessageRole = 'user' | 'assistant';

export interface MessageMetadata {
  intent?: string;
  entities?: string[];
  confidence?: number; // 0 to 1
  response_time_ms?: number;
  sql_executed?: boolean;
}

export interface Message {
  id: string; // Unique within conversation (e.g. UUID)
  role: MessageRole;
  content: string;
  language: string; // Default: 'en'
  created_at: string; // ISO DateTime string
  sql?: string; // Optional (assistant only)
  results?: any; // Optional (assistant only)
  metadata?: MessageMetadata;
}

export interface Conversation {
  _id: string; // Generated unique UUID/ObjectId
  catalyst_user_id: string; // Partition Key
  title: string;
  description?: string;
  crime_category?: string; // Enum
  location?: string;
  created_at: string; // ISO DateTime string
  updated_at: string; // Sort Key (ISO DateTime string)
  is_archived: boolean;
  messages: Message[];
}
