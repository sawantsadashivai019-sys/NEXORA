from rest_framework import serializers
from .models import UploadedFile, KnowledgeBase, ChatSession, ChatMessage, FAQList, FAQItem, FlashcardDeck, Flashcard, Quiz, QuizQuestion


class UploadedFileSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = UploadedFile
        fields = [
            'id', 'name', 'file_url', 'content', 'uploaded_at', 'file_size',
            'gemini_file_id', 'gemini_file_uri', 'gemini_upload_status'
        ]
        read_only_fields = [
            'id', 'uploaded_at', 'file_size', 'gemini_file_id', 
            'gemini_file_uri', 'gemini_upload_status'
        ]
    
    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url
        return None


class KnowledgeBaseSerializer(serializers.ModelSerializer):
    files = UploadedFileSerializer(many=True, read_only=True)
    file_count = serializers.SerializerMethodField()
    
    class Meta:
        model = KnowledgeBase
        fields = [
            'id', 'name', 'description', 'files', 'file_count', 'mindmap', 'mindmap_generated_at', 'file_search_store_name', 'created_at', 
            'updated_at'
        ]
        read_only_fields = ['id', 'mindmap', 'mindmap_generated_at', 'file_search_store_name', 'created_at', 'updated_at']
    
    def get_file_count(self, obj):
        return obj.files.count()


class ChatMessageSerializer(serializers.ModelSerializer):
    sources_used = UploadedFileSerializer(many=True, read_only=True)
    
    class Meta:
        model = ChatMessage
        fields = [
            'id', 'content', 'is_user', 'response', 'citations', 'suggestions',
            'sources_used', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'citations', 'suggestions']


class ChatSessionSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)
    message_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatSession
        fields = [
            'id', 'knowledge_base', 'title', 'created_at', 'updated_at', 
            'messages', 'message_count', 'gemini_session_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'gemini_session_name']
    
    def get_message_count(self, obj):
        return obj.messages.count()


# ContextCacheSerializer removed - not needed for free tier


class FAQItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQItem
        fields = ['id', 'question', 'answer']


class FAQListSerializer(serializers.ModelSerializer):
    items = FAQItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = FAQList
        fields = ['id', 'knowledge_base', 'title', 'created_at', 'items']
        read_only_fields = ['id', 'created_at', 'items']


class FAQListCreateSerializer(serializers.ModelSerializer):
    knowledge_base_id = serializers.UUIDField()
    
    class Meta:
        model = FAQList
        fields = ['knowledge_base_id', 'title']
    
    def validate_knowledge_base_id(self, value):
        try:
            KnowledgeBase.objects.get(id=value)
        except KnowledgeBase.DoesNotExist:
            raise serializers.ValidationError("Knowledge base not found.")
        return value


class FlashcardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Flashcard
        fields = ['id', 'front', 'back']


class FlashcardDeckSerializer(serializers.ModelSerializer):
    cards = FlashcardSerializer(many=True, read_only=True)
    
    class Meta:
        model = FlashcardDeck
        fields = ['id', 'knowledge_base', 'title', 'created_at', 'cards']
        read_only_fields = ['id', 'created_at', 'cards']


class QuizQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizQuestion
        fields = ['id', 'question', 'options', 'correct_answer', 'hint', 'explanation']


class QuizSerializer(serializers.ModelSerializer):
    questions = QuizQuestionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Quiz
        fields = ['id', 'knowledge_base', 'title', 'created_at', 'questions']
        read_only_fields = ['id', 'created_at', 'questions']