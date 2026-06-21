export type MessageRole = 'user' | 'assistant';

export interface MessageMetadata {
  intent?: string;
  entities?: string[];
  confidence?: number;
  response_time_ms?: number;
  sql_executed?: boolean;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  language: string;
  created_at: string;
  sql?: string;
  results?: any;
  metadata?: MessageMetadata;
}

export class ConversationModel {
  public _id: string;
  public catalyst_user_id: string;
  public title: string;
  public description: string | null;
  public crime_category: string | null;
  public location: string | null;
  public created_at: string;
  public updated_at: string;
  public is_archived: boolean;
  public messages: Message[];

  constructor(data: {
    _id?: string;
    catalyst_user_id: string;
    title: string;
    description?: string | null;
    crime_category?: string | null;
    location?: string | null;
    created_at?: string | Date;
    updated_at?: string | Date;
    is_archived?: boolean;
    messages?: Message[];
  }) {
    this._id = data._id || 'conv_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    this.catalyst_user_id = data.catalyst_user_id;
    this.title = data.title;
    this.description = data.description || null;
    this.crime_category = data.crime_category || null;
    this.location = data.location || null;
    this.created_at = data.created_at ? new Date(data.created_at).toISOString() : new Date().toISOString();
    this.updated_at = data.updated_at ? new Date(data.updated_at).toISOString() : new Date().toISOString();
    this.is_archived = typeof data.is_archived === 'boolean' ? data.is_archived : false;
    this.messages = data.messages || [];
  }

  validate(): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    if (!this.catalyst_user_id || typeof this.catalyst_user_id !== 'string' || this.catalyst_user_id.trim() === '') {
      errors.push('catalyst_user_id is required and must be a non-empty string');
    }
    if (!this.title || typeof this.title !== 'string' || this.title.trim() === '') {
      errors.push('title is required and must be a non-empty string');
    } else if (this.title.length > 200) {
      errors.push('title must be max 200 characters');
    }
    if (this.description && this.description.length > 500) {
      errors.push('description must be max 500 characters');
    }
    
    this.messages.forEach((msg, idx) => {
      if (!msg.id) errors.push(`message[${idx}]: id is required`);
      if (!['user', 'assistant'].includes(msg.role)) {
        errors.push(`message[${idx}]: role must be 'user' or 'assistant'`);
      }
      if (!msg.content) errors.push(`message[${idx}]: content is required`);
    });

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Convert standard ConversationModel object to Zoho Catalyst NoSQL Custom JSON format.
   * Note: dates are mapped to String (S) as Catalyst NoSQL natively only supports S, N, BOOL, L, M, and Set types.
   */
  toCatalystJSON(): any {
    const customJSON: any = {
      _id: { S: this._id },
      catalyst_user_id: { S: this.catalyst_user_id },
      title: { S: this.title },
      created_at: { S: this.created_at },
      updated_at: { S: this.updated_at },
      is_archived: { BOOL: this.is_archived }
    };

    if (this.description) customJSON.description = { S: this.description };
    if (this.crime_category) customJSON.crime_category = { S: this.crime_category };
    if (this.location) customJSON.location = { S: this.location };

    // Map messages array to NoSQL List of Maps (L of M)
    customJSON.messages = {
      L: this.messages.map((msg) => {
        const msgMap: any = {
          id: { S: msg.id },
          role: { S: msg.role },
          content: { S: msg.content },
          language: { S: msg.language || 'en' },
          created_at: { S: msg.created_at }
        };
        if (msg.sql) msgMap.sql = { S: msg.sql };
        if (msg.results) {
          msgMap.results = { S: typeof msg.results === 'string' ? msg.results : JSON.stringify(msg.results) };
        }
        if (msg.metadata) {
          const metaMap: any = {};
          if (msg.metadata.intent) metaMap.intent = { S: msg.metadata.intent };
          if (msg.metadata.confidence !== undefined) metaMap.confidence = { N: String(msg.metadata.confidence) };
          if (msg.metadata.response_time_ms !== undefined) metaMap.response_time_ms = { N: String(msg.metadata.response_time_ms) };
          if (msg.metadata.sql_executed !== undefined) metaMap.sql_executed = { BOOL: msg.metadata.sql_executed };
          if (msg.metadata.entities) {
            metaMap.entities = { SS: msg.metadata.entities };
          }
          msgMap.metadata = { M: metaMap };
        }
        return { M: msgMap };
      })
    };

    return customJSON;
  }

  /**
   * Parse a Custom JSON document fetched from Zoho Catalyst NoSQL into a standard ConversationModel instance.
   */
  static fromCatalystJSON(catalystDoc: any): ConversationModel {
    const rawMessages = catalystDoc.messages?.L || [];
    const messages: Message[] = rawMessages.map((item: any) => {
      const m = item.M || {};
      const metadataRaw = m.metadata?.M || {};
      
      let parsedResults: any = undefined;
      if (m.results?.S) {
        try {
          parsedResults = JSON.parse(m.results.S);
        } catch {
          parsedResults = m.results.S;
        }
      }

      return {
        id: m.id?.S || '',
        role: (m.role?.S as MessageRole) || 'user',
        content: m.content?.S || '',
        language: m.language?.S || 'en',
        created_at: m.created_at?.S || '',
        sql: m.sql?.S || undefined,
        results: parsedResults,
        metadata: {
          intent: metadataRaw.intent?.S || undefined,
          confidence: metadataRaw.confidence?.N !== undefined ? Number(metadataRaw.confidence.N) : undefined,
          response_time_ms: metadataRaw.response_time_ms?.N !== undefined ? Number(metadataRaw.response_time_ms.N) : undefined,
          sql_executed: metadataRaw.sql_executed?.BOOL !== undefined ? metadataRaw.sql_executed.BOOL : undefined,
          entities: metadataRaw.entities?.SS || undefined
        }
      };
    });

    return new ConversationModel({
      _id: catalystDoc._id?.S,
      catalyst_user_id: catalystDoc.catalyst_user_id?.S || '',
      title: catalystDoc.title?.S || '',
      description: catalystDoc.description?.S || null,
      crime_category: catalystDoc.crime_category?.S || null,
      location: catalystDoc.location?.S || null,
      created_at: catalystDoc.created_at?.S,
      updated_at: catalystDoc.updated_at?.S,
      is_archived: catalystDoc.is_archived?.BOOL ?? false,
      messages
    });
  }
}
