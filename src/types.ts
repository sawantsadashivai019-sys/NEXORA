
export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  file_count: number;
  cache_status: 'no_cache' | 'cached' | 'expired';
  cache_expires_at?: string;
  mindmap?: MapNode[] | MapNode;
  mindmap_generated_at?: string;
  file_search_store_name?: string | null;
}

export interface Source {
  id: string;
  name: string;
  content: string;
  knowledge_base?: string;
  gemini_upload_status?: 'pending' | 'uploaded' | 'failed';
  uploaded_at?: string;
  file_size?: number;
  type?: string;
}

export interface ChatSession {
  id: string;
  title?: string;
  knowledge_base?: string;
  created_at: string;
  updated_at: string;
  messages?: ChatMessage[];
  message_count?: number;
  gemini_session_name?: string | null;
}

export interface Citation {
  sourceId: string;
  snippet: string;
  originalMatch: string;
}

export interface ChatMessage {
  isUser: boolean;
  text: string;
  citations?: Citation[];
  suggestions?: string[];
  session_id?: string;
  message_id?: string;
}

export interface Note {
  id: string;
  content: string;
}

export interface MapNode {
  id: string;
  label: string;
  content?: string;
  children?: MapNode[];
  source_ref?: string; // ID of the source
  text_snippet?: string;
}