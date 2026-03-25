from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('examination', '0004_result_publication'),
        ('academic', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Drop the old table and recreate with exam_type key
        migrations.DeleteModel(
            name='ResultPublication',
        ),
        migrations.CreateModel(
            name='ResultPublication',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_published', models.BooleanField(default=False)),
                ('published_at', models.DateTimeField(blank=True, null=True)),
                ('class_for', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='result_publications',
                    to='academic.class',
                )),
                ('exam_type', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='publications',
                    to='examination.examtype',
                )),
                ('published_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='published_results',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'unique_together': {('exam_type', 'class_for')},
            },
        ),
    ]
