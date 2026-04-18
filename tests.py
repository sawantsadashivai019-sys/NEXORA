from django.test import TestCase
from django.urls import reverse
from .models import KnowledgeBase, UploadedFile, ChatSession
from unittest.mock import patch

class MindMapEndpointTest(TestCase):
    def test_mindmap_returns_structure(self):
        kb = KnowledgeBase.objects.create(name='Test KB', description='For testing')
        UploadedFile.objects.create(knowledge_base=kb, name='test.txt', content='Hello world', file_size=20)

        # Patch the MindMapService to return a predictable structure
        with patch('api.services.mindmap_service.MindMapService.generate_mindmap') as mock_gen:
            mock_gen.return_value = [{
                'id': 'root',
                'label': 'Root Node',
                'content': 'Root content',
                'children': [],
                'source_ref': None,
                'text_snippet': None
            }]

            url = reverse('knowledge-base-mindmap', kwargs={'id': kb.id})
            response = self.client.post(url, data={}, content_type='application/json')
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn('mindmap', data)
            self.assertIsInstance(data['mindmap'], list)
            self.assertEqual(data['mindmap'][0]['id'], 'root')

    def test_mindmap_is_persisted_on_knowledge_base(self):
        kb = KnowledgeBase.objects.create(name='KB Save', description='save test')
        UploadedFile.objects.create(knowledge_base=kb, name='s.txt', content='One. Two.', file_size=10)

        with patch('api.services.mindmap_service.MindMapService.generate_mindmap') as mock_gen:
            mock_gen.return_value = [{
                'id': 'root',
                'label': 'Root Node',
                'content': 'Root content',
                'children': [],
                'source_ref': None,
                'text_snippet': None
            }]

            url = reverse('knowledge-base-mindmap', kwargs={'id': kb.id})
            response = self.client.post(url, data={}, content_type='application/json')
            self.assertEqual(response.status_code, 200)
            data = response.json()

            # ensure saved on KB
            kb.refresh_from_db()
            self.assertIsNotNone(kb.mindmap)
            self.assertEqual(kb.mindmap, data['mindmap'])
            self.assertIsNotNone(kb.mindmap_generated_at)

    def test_mindmap_fallback_on_gemini_error(self):
        kb = KnowledgeBase.objects.create(name='KB fallback', description='fallback test')
        UploadedFile.objects.create(knowledge_base=kb, name='f.txt', content='Alpha. Beta. Gamma.', file_size=10)

        # Force the MindMapService to raise (simulates Gemini parse failure)
        with patch('api.services.gemini_service.GeminiService.generate_structured_mindmap') as mock_gen:
            mock_gen.side_effect = ValueError('gemini failed')

            url = reverse('knowledge-base-mindmap', kwargs={'id': kb.id})
            response = self.client.post(url, data={}, content_type='application/json')
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn('mindmap', data)
            # Fallback should return at least one root node with children
            self.assertTrue(len(data['mindmap']) >= 1)
            root = data['mindmap'][0]
            self.assertIn('children', root)
            self.assertTrue(len(root['children']) >= 1)

    def test_mindmap_is_persisted_on_knowledge_base(self):
        kb = KnowledgeBase.objects.create(name='KB Save', description='save test')
        UploadedFile.objects.create(knowledge_base=kb, name='s.txt', content='One. Two.', file_size=10)

        with patch('api.services.mindmap_service.MindMapService.generate_mindmap') as mock_gen:
            mock_gen.return_value = [{
                'id': 'root',
                'label': 'Root Node',
                'content': 'Root content',
                'children': [],
                'source_ref': None,
                'text_snippet': None
            }]

            url = reverse('knowledge-base-mindmap', kwargs={'id': kb.id})
            response = self.client.post(url, data={}, content_type='application/json')
            self.assertEqual(response.status_code, 200)
            data = response.json()

            # ensure saved on KB
            kb.refresh_from_db()
            self.assertIsNotNone(kb.mindmap)
            self.assertEqual(kb.mindmap, data['mindmap'])
            self.assertIsNotNone(kb.mindmap_generated_at)

    def test_chat_session_gemini_and_rag_used(self):
        kb = KnowledgeBase.objects.create(name='KB RAG', description='RAG test', file_search_store_name=None)
        UploadedFile.objects.create(knowledge_base=kb, name='doc.txt', content='Doc content here', file_size=10)

        # Patch GeminiService.generate_chat_with_rag to assert it is called and return predictable output
        with patch('api.services.gemini_service.GeminiService.generate_chat_with_rag') as mock_chat:
            mock_chat.return_value = {'response': 'RAG answer', 'suggestions': ['Q1','Q2']}

            resp = self.client.post(reverse('chat-response'), data={
                'query': 'Tell me about the docs',
                'knowledge_base_id': str(kb.id)
            }, content_type='application/json')

            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertIn('response', data)
            self.assertEqual(data['response'], 'RAG answer')

            # session should be created and have a gemini_session_name set by server
            session_id = data.get('session_id')
            self.assertIsNotNone(session_id)
            session = ChatSession.objects.get(id=session_id)
            self.assertTrue(bool(session.gemini_session_name))

    def test_file_upload_creates_file_search_store(self):
        kb = KnowledgeBase.objects.create(name='KB FS', description='File search test')

        # patch GeminiService.upload_file and file search store methods
        with patch('api.services.gemini_service.GeminiService.upload_file') as mock_upload, \
             patch('api.services.gemini_service.GeminiService.create_file_search_store') as mock_create_store, \
             patch('api.services.gemini_service.GeminiService.upload_to_file_search_store') as mock_upload_to_store:

            mock_upload.return_value = type('F', (), {'name': 'files/1', 'uri': 'gs://x/1'})
            mock_create_store.return_value = type('S', (), {'name': 'fileSearchStores/test'})
            mock_upload_to_store.return_value = None

            # prepare a small text file for upload
            from django.core.files.uploadedfile import SimpleUploadedFile
            f = SimpleUploadedFile('test.txt', b'hello world', content_type='text/plain')

            resp = self.client.post(reverse('file-upload'), data={'knowledge_base_id': str(kb.id), 'files': f})
            self.assertIn(resp.status_code, (200, 201))

            kb.refresh_from_db()
            self.assertIsNotNone(kb.file_search_store_name)
            self.assertTrue(kb.file_search_store_name.startswith('fileSearchStores/'))
    def test_gemini_json_extractor_accepts_noisy_output(self):
        # Ensure gemini_service can parse JSON embedded in noisy text
        from types import SimpleNamespace
        from api.services.gemini_service import GeminiService

        noisy = 'Preamble text\n```json\n{"id": "root", "label": "R", "children": []}\n```\nTrailing text'
        with patch.object(GeminiService, 'generate_content', return_value=SimpleNamespace(text=noisy)):
            gs = GeminiService()
            parsed = gs.generate_structured_mindmap('sys', 'dummy')
            self.assertIsInstance(parsed, dict)
            self.assertEqual(parsed.get('id'), 'root')

