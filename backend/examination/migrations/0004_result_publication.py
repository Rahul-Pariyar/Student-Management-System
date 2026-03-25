from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('examination', '0003_internal_marks'),
        ('academic', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ResultPublication',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_published', models.BooleanField(default=False)),
                ('published_at', models.DateTimeField(blank=True, null=True)),
                ('class_for', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='result_publications', to='academic.class')),
                ('examination', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='publications', to='examination.examination')),
                ('published_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='published_results', to=settings.AUTH_USER_MODEL)),
            ],
            options={'unique_together': {('examination', 'class_for')}},
        ),
    ]
