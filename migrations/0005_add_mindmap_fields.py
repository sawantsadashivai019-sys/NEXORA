# Generated migration to add mindmap persistence fields to KnowledgeBase
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0004_remove_knowledgebase_cache_expires_at_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name='knowledgebase',
            name='mindmap',
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='knowledgebase',
            name='mindmap_generated_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
