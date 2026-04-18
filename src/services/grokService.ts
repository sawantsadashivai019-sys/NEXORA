import type { Source, KnowledgeBase, ChatSession } from '../types';

const API_BASE_URL = 'http://localhost:8000/api';

interface ApiSource {
  id: string;
  name: string;
  content: string;
  uploaded_at: string;
  file_size: number;
  knowledge_base: string;
  gemini_upload_status: 'pending' | 'uploaded' | 'failed';
}

interface ChatResponse {
  response: string;
  suggestions: string[];
  session_id: string;
  message_id: string;
  session_title?: string;
}

interface FileUploadResponse {
  uploaded_files: ApiSource[];
  errors: string[];
}

// Knowledge Base API functions
export async function createKnowledgeBase(name: string, description: string = ''): Promise<KnowledgeBase> {
  const response = await fetch(`${API_BASE_URL}/knowledge-bases/create/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, description }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create knowledge base');
  }

  return await response.json();
}

export async function getKnowledgeBases(): Promise<KnowledgeBase[]> {
  const response = await fetch(`${API_BASE_URL}/knowledge-bases/`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch knowledge bases');
  }
  
  return await response.json();
}

export async function getKnowledgeBaseFiles(knowledgeBaseId: string): Promise<Source[]> {
  const response = await fetch(`${API_BASE_URL}/knowledge-bases/${knowledgeBaseId}/files/`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch knowledge base files');
  }
  
  return await response.json();
}

export async function generateResponse(
  query: string, 
  knowledgeBaseId: string,
  sessionId?: string
): Promise<{ aiResponseText: string, suggestions: string[], sessionId: string, sessionTitle?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/response/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        knowledge_base_id: knowledgeBaseId,
        session_id: sessionId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get response from API');
    }

    const data: ChatResponse = await response.json();
    
    return {
      aiResponseText: data.response,
      suggestions: data.suggestions || [],
      sessionId: data.session_id,
      sessionTitle: data.session_title,
    };

  } catch (error) {
    console.error("Error calling Django API:", error);
    throw new Error("Failed to get response from AI. Check backend connection.");
  }
}

export async function uploadFiles(files: FileList, knowledgeBaseId: string): Promise<{ uploaded: Source[], errors: string[] }> {
  const formData = new FormData();
  
  // Add all files to form data
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }
  formData.append('knowledge_base_id', knowledgeBaseId);

  const response = await fetch(`${API_BASE_URL}/files/upload/`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to upload files');
  }

  const data: FileUploadResponse = await response.json();
  return {
    uploaded: data.uploaded_files,
    errors: data.errors,
  };
}

export async function uploadUrl(url: string, knowledgeBaseId: string): Promise<ApiSource> {
  const response = await fetch(`${API_BASE_URL}/urls/upload/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      knowledge_base_id: knowledgeBaseId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to upload URL');
  }

  // The backend returns the serialized UploadedFile object.
  return await response.json();
}

// Legacy function for backward compatibility - consider removing
export async function uploadFile(file: File): Promise<ApiSource> {
  throw new Error('Use uploadFiles with knowledge base instead');
}

export async function getUploadedFiles(knowledgeBaseId?: string): Promise<ApiSource[]> {
  const url = knowledgeBaseId ? `${API_BASE_URL}/files/?knowledge_base=${encodeURIComponent(knowledgeBaseId)}` : `${API_BASE_URL}/files/`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch uploaded files');
  }

  return response.json();
}

export async function deleteFile(fileId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/files/${fileId}/`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete file');
  }
}

// FAQ generation functions
export interface FAQGenerationRequest {
  knowledge_base_id: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface FAQList {
  id: string;
  knowledge_base: string;
  title: string;
  items: FAQItem[];
  created_at: string;
}

export async function generateFAQ(knowledgeBaseId: string): Promise<FAQList> {
  const response = await fetch(`${API_BASE_URL}/faqs/generate/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ knowledge_base_id: knowledgeBaseId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to generate FAQ');
  }

  return response.json();
}

export async function getFAQs(knowledgeBaseId?: string): Promise<FAQList[]> {
  const url = knowledgeBaseId ? `${API_BASE_URL}/faqs/?knowledge_base=${encodeURIComponent(knowledgeBaseId)}` : `${API_BASE_URL}/faqs/`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch FAQs');
  }

  return response.json();
}

export async function getFAQ(faqId: string): Promise<FAQList> {
  const response = await fetch(`${API_BASE_URL}/faqs/${faqId}/`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch FAQ');
  }

  return response.json();
}

export async function deleteFAQ(faqId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/faqs/${faqId}/`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to delete FAQ');
  }
}

export async function generateSummary(knowledgeBaseId: string): Promise<string> {
  try {
    const result = await generateResponse(
      'Please provide a comprehensive summary of all the documents in this knowledge base.',
      knowledgeBaseId
    );
    return result.aiResponseText;
  } catch (error) {
    console.error("Error generating summary:", error);
    throw new Error("Failed to generate summary.");
  }
}

export async function generateMindMap(knowledgeBaseId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/knowledge-bases/${knowledgeBaseId}/mindmap/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to generate mind map');
  }

  return await response.json();
}

export async function getChatSessions(knowledgeBaseId?: string): Promise<ChatSession[]> {
  const url = knowledgeBaseId ? `${API_BASE_URL}/chat/sessions/?knowledge_base=${encodeURIComponent(knowledgeBaseId)}` : `${API_BASE_URL}/chat/sessions/`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch chat sessions');
  return await response.json();
}

// Flashcards & Quiz Types
export interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export interface FlashcardDeck {
  id: string;
  title: string;
  cards: Flashcard[];
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  hint?: string;
  explanation?: string;
}

export interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
  created_at: string;
}

// Flashcards API
export async function getFlashcardDecks(knowledgeBaseId: string): Promise<FlashcardDeck[]> {
  const response = await fetch(`${API_BASE_URL}/flashcards/?knowledge_base=${encodeURIComponent(knowledgeBaseId)}`);
  if (!response.ok) throw new Error('Failed to fetch flashcard decks');
  return response.json();
}

export async function generateFlashcards(knowledgeBaseId: string): Promise<FlashcardDeck> {
  const response = await fetch(`${API_BASE_URL}/flashcards/generate/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ knowledge_base_id: knowledgeBaseId }),
  });
  if (!response.ok) throw new Error('Failed to generate flashcards');
  return response.json();
}

// Quiz API
export async function getQuizzes(knowledgeBaseId: string): Promise<Quiz[]> {
  const response = await fetch(`${API_BASE_URL}/quizzes/?knowledge_base=${encodeURIComponent(knowledgeBaseId)}`);
  if (!response.ok) throw new Error('Failed to fetch quizzes');
  return response.json();
}

export async function generateQuiz(knowledgeBaseId: string): Promise<Quiz> {
  const response = await fetch(`${API_BASE_URL}/quizzes/generate/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ knowledge_base_id: knowledgeBaseId }),
  });
  if (!response.ok) throw new Error('Failed to generate quiz');
  return response.json();
}
