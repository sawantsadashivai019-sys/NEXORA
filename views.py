from django.shortcuts import render
from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.http import FileResponse, Http404
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
import os
import logging
import threading
import uuid
from django.utils import timezone

from .models import UploadedFile, ChatSession, ChatMessage, FAQList, FAQItem, KnowledgeBase, FlashcardDeck, Flashcard, Quiz, QuizQuestion
from .serializers import (
    UploadedFileSerializer, ChatSessionSerializer, ChatMessageSerializer,
    FAQListSerializer, FAQListCreateSerializer, KnowledgeBaseSerializer,
    FlashcardDeckSerializer, FlashcardSerializer, QuizSerializer, QuizQuestionSerializer
)
# Services (refactored from utils and views)
from .services.grok_service import GrokService
from .services.mindmap_service import MindMapService
from .utils import extract_text_from_file, extract_text_from_url

# Instantiate services
grok_service = GrokService()
mindmap_service = MindMapService()

logger = logging.getLogger(__name__)


class KnowledgeBaseCreateView(generics.CreateAPIView):
    """Create a new knowledge base"""
    serializer_class = KnowledgeBaseSerializer
    
    def post(self, request, *args, **kwargs):
        name = request.data.get('name', '').strip()
        description = request.data.get('description', '').strip()
        
        if not name:
            return Response(
                {'error': 'Knowledge base name is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        kb = KnowledgeBase.objects.create(name=name, description=description)
        serializer = self.get_serializer(kb)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class KnowledgeBaseListView(generics.ListAPIView):
    """List all knowledge bases"""
    queryset = KnowledgeBase.objects.all()
    serializer_class = KnowledgeBaseSerializer


class KnowledgeBaseDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete a knowledge base"""
    queryset = KnowledgeBase.objects.all()
    serializer_class = KnowledgeBaseSerializer
    lookup_field = 'id'


class KnowledgeBaseFilesView(generics.ListAPIView):
    """List files in a knowledge base"""
    serializer_class = UploadedFileSerializer
    
    def get_queryset(self):
        kb_id = self.kwargs['kb_id']
        return UploadedFile.objects.filter(knowledge_base=kb_id)


class FileUploadView(generics.CreateAPIView):
    """Upload files to a knowledge base"""
    serializer_class = UploadedFileSerializer
    parser_classes = (MultiPartParser, FormParser)
    
    def post(self, request, *args, **kwargs):
        if 'files' not in request.FILES:
            return Response(
                {'error': 'No files provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        knowledge_base_id = request.data.get('knowledge_base_id')
        if not knowledge_base_id:
            return Response(
                {'error': 'knowledge_base_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            knowledge_base = KnowledgeBase.objects.get(id=knowledge_base_id)
        except KnowledgeBase.DoesNotExist:
            return Response(
                {'error': 'Knowledge base not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        uploaded_files = request.FILES.getlist('files')
        results = []
        errors = []
        
        for uploaded_file in uploaded_files:
            # Validate file type
            allowed_extensions = ['.pdf', '.txt', '.md']
            if not any(uploaded_file.name.lower().endswith(ext) for ext in allowed_extensions):
                errors.append(f'{uploaded_file.name}: Only PDF, TXT, and MD files are supported')
                continue
            
            try:
                # Extract text content
                file_content = uploaded_file.read()
                text_content = extract_text_from_file(file_content, uploaded_file.name)
                
                # Reset file pointer
                uploaded_file.seek(0)
                
                # Create file record
                file_obj = UploadedFile.objects.create(
                    knowledge_base=knowledge_base,
                    name=uploaded_file.name,
                    file=uploaded_file,
                    content=text_content,
                    file_size=uploaded_file.size
                )
                
                # Upload to Grok (dummy) using GrokService to record dummy IDs so UI logic remains structurally intact 
                try:
                    grok_file = grok_service.upload_file(file_obj.file.path, uploaded_file.name)
                    file_obj.gemini_file_id = grok_file.name.split('/')[-1]
                    file_obj.gemini_file_uri = grok_file.uri
                    file_obj.gemini_upload_status = 'uploaded'
                    file_obj.save()
                except Exception as e:
                    logger.warning(f"Failed to record Grok dummy file details for {uploaded_file.name}: {e}")
                    file_obj.gemini_upload_status = 'failed'
                    file_obj.save()

                serializer = self.get_serializer(file_obj)
                results.append(serializer.data)
                
            except Exception as e:
                logger.error(f"Error uploading file {uploaded_file.name}: {e}")
                errors.append(f'{uploaded_file.name}: {str(e)}')
        
        response_data = {
            'uploaded_files': results,
            'errors': errors
        }
        
        if results:
            return Response(response_data, status=status.HTTP_201_CREATED)
        else:
            return Response(response_data, status=status.HTTP_400_BAD_REQUEST)


class UrlUploadView(generics.CreateAPIView):
    """Fetch text from a URL and save it as a text file in the knowledge base"""
    serializer_class = UploadedFileSerializer

    def post(self, request, *args, **kwargs):
        url = request.data.get('url', '').strip()
        knowledge_base_id = request.data.get('knowledge_base_id')

        if not url:
            return Response({'error': 'URL is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not knowledge_base_id:
            return Response({'error': 'knowledge_base_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            knowledge_base = KnowledgeBase.objects.get(id=knowledge_base_id)
        except KnowledgeBase.DoesNotExist:
            return Response({'error': 'Knowledge base not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            # Extract text from the URL
            text_content = extract_text_from_url(url)

            # Generate a distinct internal filename
            # Fallback name if it's too long or weird
            sanitized_name = "url_import.txt"
            from urllib.parse import urlparse
            try:
                domain = urlparse(url).netloc.replace('www.', '')
                if domain:
                    # Truncate to prevent extremely long paths
                    domain = domain[:100]
                    sanitized_name = f"{domain}_extraction.txt"
            except Exception:
                pass

            # Create an in-memory Django file to save it
            file_content = ContentFile(text_content.encode('utf-8'), name=sanitized_name)

            file_obj = UploadedFile.objects.create(
                knowledge_base=knowledge_base,
                name=url, # store original url as the display name
                file=file_content,
                content=text_content,
                file_size=len(text_content.encode('utf-8'))
            )

            # Upload to Grok (dummy) using GrokService
            try:
                grok_file = grok_service.upload_file(file_obj.file.path, file_obj.name)
                file_obj.gemini_file_id = grok_file.name.split('/')[-1]
                file_obj.gemini_file_uri = grok_file.uri
                file_obj.gemini_upload_status = 'uploaded'
                file_obj.save()
            except Exception as e:
                logger.warning(f"Failed to record dummy Grok URL content {url}: {e}")
                file_obj.gemini_upload_status = 'failed'
                file_obj.save()

            serializer = self.get_serializer(file_obj)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error processing URL {url}: {e}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class FileListView(generics.ListAPIView):
    """List uploaded files. Use optional query param `?knowledge_base=<kb_id>` to scope to a KB."""
    serializer_class = UploadedFileSerializer

    def get_queryset(self):
        kb = self.request.query_params.get('knowledge_base')
        if kb:
            return UploadedFile.objects.filter(knowledge_base=kb)
        return UploadedFile.objects.all()


class FileDeleteView(generics.DestroyAPIView):
    """Delete uploaded file"""
    queryset = UploadedFile.objects.all()
    lookup_field = 'id'
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        # Attempt to delete remote Grok dummy artifacts (best-effort)
        try:
            # Delete the temporary Grok File if uploaded
            if instance.gemini_file_id:
                try:
                    grok_service.delete_file(f'files/{instance.gemini_file_id}')
                except Exception as e:
                    logger.warning(f"Failed to delete Grok dummy file for {instance.name}: {e}")

            # If KB has a File Search store, try to remove imported document(s) matching this file's name
            kb = instance.knowledge_base
            if kb and getattr(kb, 'file_search_store_name', None):
                try:
                    grok_service.delete_file_search_document(kb.file_search_store_name, display_name=instance.name)
                except Exception as e:
                    logger.warning(f"Failed to delete File Search documents for {instance.name} in store {kb.file_search_store_name}: {e}")
        except Exception as e:
            logger.warning(f"Exception during remote cleanup for file {instance.id}: {e}")

        # Delete the physical file from disk/storage
        if instance.file:
            instance.file.delete()

        # Delete the database record
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChatResponseView(views.APIView):
    """Generate chat response using knowledge base with caching"""
    
    def post(self, request):
        query = request.data.get('query', '').strip()
        knowledge_base_id = request.data.get('knowledge_base_id')
        session_id = request.data.get('session_id')
        
        if not query:
            return Response(
                {'error': 'Query is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not knowledge_base_id:
            return Response(
                {'error': 'knowledge_base_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get knowledge base
            knowledge_base = KnowledgeBase.objects.get(id=knowledge_base_id)
            
            # Ensure knowledge base has files
            if not knowledge_base.files.exists():
                return Response(
                    {'error': 'Knowledge base has no files'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get or create chat session
            if session_id:
                try:
                    session = ChatSession.objects.get(id=session_id)
                except ChatSession.DoesNotExist:
                    session = ChatSession.objects.create(knowledge_base=knowledge_base)
            else:
                session = ChatSession.objects.create(knowledge_base=knowledge_base)
            
            # Generate response using Grok Service (multi-turn + optional RAG)
            try:
                # Build conversation history from stored messages
                history = []
                for m in session.messages.order_by('created_at').all():
                    history.append({
                        'is_user': m.is_user,
                        'content': m.content,
                        'response': m.response
                    })

                sources = knowledge_base.files.all()
                files_mapping = "\n".join([f"{i+1}. {f.name}" for i, f in enumerate(sources)])
                
                system_instruction = (
                    f"You are an expert research assistant working with a knowledge base containing {sources.count()} documents.\n"
                    "Answer based ONLY on the provided documents and any retrieved fragments.\n"
                    "When you use information from a document, you MUST add a citation immediately after the sentence or paragraph.\n"
                    "The citation format is [Source <source_number>: \"<exact short quote snippet from the source>\"] where <source_number> matches the citation document.\n"
                    f"Use the following mapping to determine the <source_number> for a document:\n{files_mapping}\n\n"
                    "After your main response, provide 3 relevant follow-up questions under SUGGESTED_QUESTIONS:."
                )

                combined = "\n\n".join(f"Source {i+1}: {s.content}" for i,s in enumerate(sources))
                
                # Append the combined document context dynamically to the system instruction so grok can use it.
                system_instruction += f"\n\nHere are the documents in the knowledge base:\n{combined}"

                result = grok_service.generate_chat_with_rag(
                    system_instruction=system_instruction,
                    history=history,
                    query=query,
                    gemini_files=None,
                    file_search_store_name=None,
                    model='grok-2-latest'
                )

                # mark session as Grok-backed so UI and tests can detect Grok usage
                if not session.gemini_session_name:
                    session.gemini_session_name = f'grok-session-{session.id}'
                    session.save()

            except Exception as files_error:
                logger.warning(f"Grok QA failed: {files_error}")
                # Last-resort fallback to concatenated local text
                sources = knowledge_base.files.all()
                combined = "\n\n".join(f"Source {i+1}: {s.content}" for i,s in enumerate(sources))
                result = grok_service.generate_qa_from_text(query, combined)
            
            
            # Auto-generate session title from first message
            if not session.title and session.messages.count() == 0:
                # Generate a short title from the query
                title_words = query.split()[:6]  # First 6 words
                session.title = ' '.join(title_words) + ('...' if len(query.split()) > 6 else '')
                session.save()
            
            # Save message
            message = ChatMessage.objects.create(
                session=session,
                content=query,
                is_user=True,
                response=result['response'],
                suggestions=result.get('suggestions', []),
                citations=result.get('citations', [])
            )
            
            # Add sources used to the message
            sources_used = knowledge_base.files.filter(
                gemini_upload_status='uploaded'
            )
            message.sources_used.set(sources_used)
            
            return Response({
                'response': result['response'],
                'suggestions': result.get('suggestions', []),
                'session_id': session.id,
                'message_id': message.id,
                'session_title': session.title
            })
            
        except KnowledgeBase.DoesNotExist:
            return Response(
                {'error': 'Knowledge base not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error generating chat response: {e}")
            return Response(
                {'error': f'Error generating response: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ChatSessionListView(generics.ListAPIView):
    """List chat sessions. Optional query param `?knowledge_base=<kb_id>` to scope results."""
    serializer_class = ChatSessionSerializer

    def get_queryset(self):
        kb = self.request.query_params.get('knowledge_base')
        if kb:
            return ChatSession.objects.filter(knowledge_base__id=kb).order_by('-updated_at')
        return ChatSession.objects.all().order_by('-updated_at')


class MindMapView(views.APIView):
    """Generate a structured mind map for a knowledge base"""

    parser_classes = (JSONParser,)

    def post(self, request, id):
        try:
            knowledge_base = KnowledgeBase.objects.get(id=id)
        except KnowledgeBase.DoesNotExist:
            return Response({'error': 'Knowledge base not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            nodes = mindmap_service.generate_mindmap(knowledge_base)

            # Accept Pydantic model instances or plain dicts (tests may patch to return dicts)
            serialized = []
            for n in nodes:
                if hasattr(n, 'dict'):
                    # pydantic v1: dict(), v2: model_dump()
                    try:
                        serialized.append(n.dict())
                    except Exception:
                        serialized.append(n.model_dump())
                elif isinstance(n, dict):
                    serialized.append(n)
                else:
                    # Last-resort: coerce to dict
                    serialized.append(dict(n))

            # Persist the generated mindmap to the KnowledgeBase so it can be retrieved later
            try:
                knowledge_base.mindmap = serialized
                knowledge_base.mindmap_generated_at = timezone.now()
                knowledge_base.save()
            except Exception as e:
                logger.warning(f"Failed to persist mindmap to KnowledgeBase {knowledge_base.id}: {e}")

            return Response({'mindmap': serialized}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception("Error generating mindmap")
            return Response({'error': 'Failed to generate mindmap', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GenerateFAQView(views.APIView):
    def post(self, request):
        kb_id = request.data.get('knowledge_base_id')
        if not kb_id:
            return Response({'error': 'knowledge_base_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            kb = KnowledgeBase.objects.get(id=kb_id)
        except KnowledgeBase.DoesNotExist:
            return Response({'error': 'Knowledge base not found'}, status=status.HTTP_404_NOT_FOUND)
            
        files = kb.files.all()
        if not files.exists():
             return Response({'error': 'Knowledge base has no files'}, status=status.HTTP_400_BAD_REQUEST)

        text_content = "\n\n".join([f.content for f in files if f.content])
        if not text_content.strip():
             return Response({'error': 'No text content found in files'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            faq_data = grok_service.generate_faq(text_content[:25000])
            
            # Save to DB
            faq_list = FAQList.objects.create(knowledge_base=kb, title=f"FAQ for {kb.name}")
            for item in faq_data:
                FAQItem.objects.create(
                    faq_list=faq_list,
                    question=item.get('question', 'Unknown Question'),
                    answer=item.get('answer', 'Unknown Answer')
                )
                
            return Response(FAQListSerializer(faq_list).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Error generating FAQ: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FAQListView(generics.ListAPIView):
    serializer_class = FAQListSerializer
    
    def get_queryset(self):
        queryset = FAQList.objects.all().order_by('-created_at')
        kb_id = self.request.query_params.get('knowledge_base')
        if kb_id:
            queryset = queryset.filter(knowledge_base__id=kb_id)
        return queryset


class FAQDetailView(generics.RetrieveDestroyAPIView):
    queryset = FAQList.objects.all()
    serializer_class = FAQListSerializer
    lookup_field = 'id'


# Cache views removed - not needed for free tier


class FlashcardDeckListView(generics.ListAPIView):
    serializer_class = FlashcardDeckSerializer
    
    def get_queryset(self):
        queryset = FlashcardDeck.objects.all().order_by('-created_at')
        kb_id = self.request.query_params.get('knowledge_base')
        if kb_id:
            queryset = queryset.filter(knowledge_base__id=kb_id)
        return queryset


class FlashcardDeckDetailView(generics.RetrieveDestroyAPIView):
    queryset = FlashcardDeck.objects.all()
    serializer_class = FlashcardDeckSerializer
    lookup_field = 'id'


class GenerateFlashcardsView(views.APIView):
    def post(self, request):
        kb_id = request.data.get('knowledge_base_id')
        if not kb_id:
            return Response({'error': 'knowledge_base_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            kb = KnowledgeBase.objects.get(id=kb_id)
        except KnowledgeBase.DoesNotExist:
            return Response({'error': 'Knowledge base not found'}, status=status.HTTP_404_NOT_FOUND)
            
        # Check for existing text content
        files = kb.files.all()
        if not files.exists():
            return Response({'error': 'Knowledge base has no files'}, status=status.HTTP_400_BAD_REQUEST)
            
        text_content = "\n\n".join([f.content for f in files if f.content])
        if not text_content.strip():
             return Response({'error': 'No text content found in files'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            cards_data = grok_service.generate_flashcards(text_content[:25000]) # Cap context
            
            # Save to DB
            deck = FlashcardDeck.objects.create(knowledge_base=kb, title=f"Flashcards for {kb.name}")
            for card in cards_data:
                Flashcard.objects.create(
                    deck=deck, 
                    front=card.get('front', 'Unknown'), 
                    back=card.get('back', 'Unknown')
                )
                
            return Response(FlashcardDeckSerializer(deck).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Error generating flashcards: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class QuizListView(generics.ListAPIView):
    serializer_class = QuizSerializer
    
    def get_queryset(self):
        queryset = Quiz.objects.all().order_by('-created_at')
        kb_id = self.request.query_params.get('knowledge_base')
        if kb_id:
            queryset = queryset.filter(knowledge_base__id=kb_id)
        return queryset


class QuizDetailView(generics.RetrieveDestroyAPIView):
    queryset = Quiz.objects.all()
    serializer_class = QuizSerializer
    lookup_field = 'id'


class GenerateQuizView(views.APIView):
    def post(self, request):
        kb_id = request.data.get('knowledge_base_id')
        if not kb_id:
            return Response({'error': 'knowledge_base_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            kb = KnowledgeBase.objects.get(id=kb_id)
        except KnowledgeBase.DoesNotExist:
            return Response({'error': 'Knowledge base not found'}, status=status.HTTP_404_NOT_FOUND)
            
        files = kb.files.all()
        if not files.exists():
             return Response({'error': 'Knowledge base has no files'}, status=status.HTTP_400_BAD_REQUEST)

        text_content = "\n\n".join([f.content for f in files if f.content])
        if not text_content.strip():
             return Response({'error': 'No text content found in files'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            quiz_data = grok_service.generate_quiz(text_content[:25000])
            
            # Save to DB
            quiz = Quiz.objects.create(knowledge_base=kb, title=f"Quiz for {kb.name}")
            for q_data in quiz_data:
                QuizQuestion.objects.create(
                    quiz=quiz,
                    question=q_data.get('question', 'Unknown Question'),
                    options=q_data.get('options', []),
                    correct_answer=q_data.get('correct_answer', ''),
                    hint=q_data.get('hint', ''),
                    explanation=q_data.get('explanation', '')
                )
                
            return Response(QuizSerializer(quiz).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Error generating quiz: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
