import os
import json
import logging
from typing import Any, List, Optional
from django.conf import settings
import requests

logger = logging.getLogger(__name__)

class GrokService:
    """Encapsulates Grok API interactions via xAI REST API."""

    def __init__(self):
        self.api_key = getattr(settings, 'GROK_API_KEY', os.environ.get('GROK_API_KEY'))
        if not self.api_key:
            logger.warning('GROK_API_KEY not set in settings or environment')
        self.base_url = "https://api.groq.com/openai/v1"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    # Dummy methods for file API since Grok doesn't support them natively
    def upload_file(self, file_path: str, display_name: Optional[str] = None) -> Any:
        class DummyFile:
            def __init__(self):
                self.name = "grok_dummy_file_id"
                self.uri = "dummy://uri"
        return DummyFile()

    def get_file(self, file_name: str) -> Any:
        class DummyFile:
            def __init__(self, name):
                self.name = name
                self.display_name = name
        return DummyFile(file_name)

    def create_file_search_store(self, display_name: str) -> Any:
        class DummyStore:
            def __init__(self):
                self.name = "grok_dummy_store"
        return DummyStore()

    def upload_to_file_search_store(self, file_path: str, file_search_store_name: str, display_name: str = None) -> Any:
        return True

    def delete_file(self, identifier: str) -> None:
        pass

    def delete_file_search_document(self, store_name: str, display_name: Optional[str] = None) -> list:
        return []

    def _call_grok(self, messages: list, model: str = "llama-3.3-70b-versatile", temperature: float = 0.5) -> str:
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature
        }
        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload,
                timeout=60
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"Grok API request failed: {e}")
            raise ValueError(f"Failed to communicate with Grok API: {e}")

    def generate_chat_with_rag(self, system_instruction: str, history: list, query: str, 
                               gemini_files: Optional[list] = None, 
                               file_search_store_name: Optional[str] = None,
                               model: str = 'llama-3.3-70b-versatile',
                               top_k: int = 3) -> dict:
        messages = [{"role": "system", "content": system_instruction}]
        for m in history:
            role = "user" if m.get('is_user') else "assistant"
            content = m.get('content') if m.get('is_user') else (m.get('response') or m.get('content', ''))
            messages.append({"role": role, "content": content})
        
        messages.append({"role": "user", "content": query})
        
        full_text = self._call_grok(messages, model=model)
        
        suggestion_marker = 'SUGGESTED_QUESTIONS:'
        suggestion_index = full_text.find(suggestion_marker)
        if suggestion_index == -1:
            return {'response': full_text, 'suggestions': [], 'citations': self._extract_citations(full_text)}

        ai_response_text = full_text[:suggestion_index].strip()
        suggestion_block = full_text[suggestion_index:]
        import re
        suggestion_regex = r'-\s*"([^"]+)"'
        matches = re.findall(suggestion_regex, suggestion_block)

        citations = self._extract_citations(ai_response_text)
        return {'response': ai_response_text, 'suggestions': matches, 'citations': citations}

    def generate_qa_from_text(self, query: str, sources_text: str) -> dict:
        prompt = f"""You are an expert research assistant. Answer only using the provided sources.
When you use information from a source, you MUST add a citation immediately after the sentence or paragraph.
The citation format is [Source <source_number>: "<exact short quote snippet from the source>"] where <source_number> matches the citation document.

Sources:
{sources_text}

Question: {query}
Assistant Response:"""
        messages = [{"role": "user", "content": prompt}]
        text = self._call_grok(messages)
        citations = self._extract_citations(text)
        return {"response": text, "suggestions": [], "citations": citations}

    def _extract_citations(self, text: str) -> list:
        import re
        pattern = r'\[[sS]ource (\d+):\s*"([^"]+)"\]'
        matches = []
        for match in re.finditer(pattern, text):
            matches.append({
                'sourceId': f"Source {match.group(1)}",
                'snippet': match.group(2),
                'originalMatch': match.group(0)
            })
        return matches

    def _generate_structured_output(self, system_prompt: str, contents_input: Any) -> Any:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": str(contents_input)}
        ]
        text = self._call_grok(messages, temperature=0.1)

        import re
        text = re.sub(r"```\s*json\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"```", "", text)
        cleaned = text.strip()

        try:
             return json.loads(cleaned)
        except Exception:
            try:
                arr_start = cleaned.find('[')
                arr_end = cleaned.rfind(']')
                if arr_start != -1 and arr_end != -1 and arr_end > arr_start:
                    return json.loads(cleaned[arr_start:arr_end+1])
            except Exception:
                pass
            
            try:
                obj_start = cleaned.find('{')
                obj_end = cleaned.rfind('}')
                if obj_start != -1 and obj_end != -1 and obj_end > obj_start:
                    return json.loads(cleaned[obj_start:obj_end+1])
            except Exception:
                pass
                
        raise ValueError('Failed to parse structured output from Grok')

    def generate_structured_mindmap(self, system_prompt: str, files_or_text: Any) -> Any:
        return self._generate_structured_output(system_prompt, files_or_text)

    def generate_flashcards(self, text_content: str) -> List[dict]:
        prompt = """
        You are a helpful assistant. Create 10 flashcards based on the provided text.
        Return a raw JSON array (and nothing else) where each element is an object with:
        - "front": The question or term.
        - "back": The answer or definition.
        """
        return self._generate_structured_output(prompt, text_content)

    def generate_quiz(self, text_content: str) -> List[dict]:
        prompt = """
        You are a helpful assistant. Create a quiz with 15 multiple-choice questions based on the provided text.
        Return a raw JSON array (and nothing else) where each element is an object with:
        - "question": The question text.
        - "options": An array of 4 possible answers (strings).
        - "correct_answer": The correct option (must be one of the options).
        - "hint": A helpful hint for the user.
        - "explanation": An explanation of why the answer is correct.
        """
        return self._generate_structured_output(prompt, text_content)

    def generate_faq(self, text_content: str) -> List[dict]:
        prompt = """
        You are a helpful assistant. Create 10 Frequently Asked Questions (FAQs) based on the provided text.
        Return a raw JSON array (and nothing else) where each element is an object with:
        - "question": The frequently asked question.
        - "answer": The detailed answer.
        """
        return self._generate_structured_output(prompt, text_content)
