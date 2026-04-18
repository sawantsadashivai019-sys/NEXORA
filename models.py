from django.db import models
from django.contrib.auth.models import User
import uuid
import os
import json


def get_upload_path(instance, filename):
    """Generate upload path for files. Files are stored under a KB-scoped folder so
    each KnowledgeBase keeps its own uploads directory: uploads/<kb_id>/<file_id>/<filename>.
    Falls back to uploads/global/<file_id>/<filename> when no KB is attached.
    """
    kb_id = None
    try:
        if getattr(instance, 'knowledge_base', None):
            kb = instance.knowledge_base
            kb_id = getattr(kb, 'id', None) or str(kb)
    except Exception:
        kb_id = None

    folder = str(kb_id) if kb_id else 'global'
    return os.path.join('uploads', folder, str(instance.id), filename)


class UploadedFile(models.Model):
    """Model for uploaded PDF files"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    knowledge_base = models.ForeignKey('KnowledgeBase', on_delete=models.CASCADE, related_name='files', null=True, blank=True)
    name = models.CharField(max_length=255)
    file = models.FileField(upload_to=get_upload_path, max_length=500)
    content = models.TextField(blank=True)  # Extracted text content
    uploaded_at = models.DateTimeField(auto_now_add=True)
    file_size = models.BigIntegerField(default=0)
    
    # Gemini File API integration
    gemini_file_id = models.CharField(max_length=255, blank=True, null=True)
    gemini_file_uri = models.CharField(max_length=500, blank=True, null=True)
    gemini_upload_status = models.CharField(max_length=50, default='pending')  # pending, uploaded, failed
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return self.name


class KnowledgeBase(models.Model):
    """Model for managing collections of documents (like NotebookLM)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    # Persisted mindmap JSON (stored as list/dict matching MapNode schema)
    mindmap = models.JSONField(blank=True, null=True, help_text="Latest generated mindmap (MapNode list or dict)")
    mindmap_generated_at = models.DateTimeField(blank=True, null=True)
    # Optional File Search store name (Gemini File Search) for RAG
    file_search_store_name = models.CharField(max_length=255, blank=True, null=True, help_text="Gemini File Search store name for this KB")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
    
    def __str__(self):
        return self.name


class ChatSession(models.Model):
    """Model for chat sessions"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    knowledge_base = models.ForeignKey(KnowledgeBase, on_delete=models.CASCADE, related_name='chat_sessions', null=True, blank=True)
    title = models.CharField(max_length=255, blank=True)  # Auto-generated from first message
    # Optional mapping to a Gemini chat/session resource or unique name (read-only for API clients)
    gemini_session_name = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"Chat: {self.title or 'Untitled'}"


class ChatMessage(models.Model):
    """Model for individual chat messages"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    content = models.TextField()
    is_user = models.BooleanField()
    response = models.TextField(blank=True)
    citations = models.JSONField(default=list)  # Store citation data as JSON
    suggestions = models.JSONField(default=list)  # Store suggested questions
    sources_used = models.ManyToManyField(UploadedFile, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']


# ContextCache model removed - not needed for free tier

def get_podcast_upload_path(instance, filename):
    pass
    
class FAQList(models.Model):
    """Collection of FAQs generated from a Knowledge Base"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    knowledge_base = models.ForeignKey(KnowledgeBase, on_delete=models.CASCADE, related_name='faq_lists')
    title = models.CharField(max_length=255, default="FAQs")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']


class FAQItem(models.Model):
    """Individual FAQ item"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    faq_list = models.ForeignKey(FAQList, on_delete=models.CASCADE, related_name='items')
    question = models.TextField(help_text="The frequently asked question")
    answer = models.TextField(help_text="The detailed answer")


class FlashcardDeck(models.Model):
    """Collection of flashcards generated from a Knowledge Base"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    knowledge_base = models.ForeignKey(KnowledgeBase, on_delete=models.CASCADE, related_name='flashcard_decks')
    title = models.CharField(max_length=255, default="Flashcards")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']


class Flashcard(models.Model):
    """Individual flashcard"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    deck = models.ForeignKey(FlashcardDeck, on_delete=models.CASCADE, related_name='cards')
    front = models.TextField(help_text="Question or Term")
    back = models.TextField(help_text="Answer or Definition")


class Quiz(models.Model):
    """Quiz generated from Knowledge Base"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    knowledge_base = models.ForeignKey(KnowledgeBase, on_delete=models.CASCADE, related_name='quizzes')
    title = models.CharField(max_length=255, default="Quiz")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']


class QuizQuestion(models.Model):
    """Individual quiz question"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    question = models.TextField()
    options = models.JSONField(help_text="List of options")
    correct_answer = models.CharField(max_length=255)
    hint = models.TextField(blank=True, null=True)
    explanation = models.TextField(blank=True, null=True)
