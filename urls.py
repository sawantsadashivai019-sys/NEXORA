from django.urls import path, include
from . import views

urlpatterns = [
    # Knowledge Base management
    path('knowledge-bases/', views.KnowledgeBaseListView.as_view(), name='knowledge-base-list'),
    path('knowledge-bases/create/', views.KnowledgeBaseCreateView.as_view(), name='knowledge-base-create'),
    path('knowledge-bases/<uuid:id>/', views.KnowledgeBaseDetailView.as_view(), name='knowledge-base-detail'),
    path('knowledge-bases/<uuid:kb_id>/files/', views.KnowledgeBaseFilesView.as_view(), name='knowledge-base-files'),
    # Mind Map generation
    path('knowledge-bases/<uuid:id>/mindmap/', views.MindMapView.as_view(), name='knowledge-base-mindmap'),
    
    # File management
    path('files/upload/', views.FileUploadView.as_view(), name='file-upload'),
    path('urls/upload/', views.UrlUploadView.as_view(), name='url-upload'),
    path('files/', views.FileListView.as_view(), name='file-list'),
    path('files/<uuid:id>/', views.FileDeleteView.as_view(), name='file-delete'),
    
    # Chat/Q&A
    path('chat/response/', views.ChatResponseView.as_view(), name='chat-response'),
    path('chat/sessions/', views.ChatSessionListView.as_view(), name='chat-sessions'),
    
    # FAQ generation
    path('faqs/generate/', views.GenerateFAQView.as_view(), name='faq-generate'),
    path('faqs/', views.FAQListView.as_view(), name='faq-list'),
    path('faqs/<uuid:id>/', views.FAQDetailView.as_view(), name='faq-detail'),

    # Flashcards
    path('flashcards/', views.FlashcardDeckListView.as_view(), name='flashcard-list'),
    path('flashcards/generate/', views.GenerateFlashcardsView.as_view(), name='flashcard-generate'),
    path('flashcards/<uuid:id>/', views.FlashcardDeckDetailView.as_view(), name='flashcard-detail'),

    # Quizzes
    path('quizzes/', views.QuizListView.as_view(), name='quiz-list'),
    path('quizzes/generate/', views.GenerateQuizView.as_view(), name='quiz-generate'),
    path('quizzes/<uuid:id>/', views.QuizDetailView.as_view(), name='quiz-detail'),
]