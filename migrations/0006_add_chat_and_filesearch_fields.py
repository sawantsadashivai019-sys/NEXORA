# Migration to add gemini_session_name on ChatSession and file_search_store_name on KnowledgeBase
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0005_add_mindmap_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name='chatsession',
            name='gemini_session_name',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='knowledgebase',
            name='file_search_store_name',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
