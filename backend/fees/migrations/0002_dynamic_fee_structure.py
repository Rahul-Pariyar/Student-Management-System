from django.db import migrations, models
import django.core.validators
import django.db.models.deletion


def migrate_fee_components(apps, schema_editor):
    FeeStructure = apps.get_model('fees', 'FeeStructure')
    FeeCategory = apps.get_model('fees', 'FeeCategory')
    FeeComponent = apps.get_model('fees', 'FeeComponent')

    field_map = [
        ('tuition_fee', 'Tuition', False),
        ('library_fee', 'Library', True),
        ('lab_fee', 'Lab', True),
        ('sports_fee', 'Sports', True),
        ('transport_fee', 'Transport', True),
        ('other_fee', 'Other', True),
    ]

    for structure in FeeStructure.objects.all():
        for field, label, is_optional in field_map:
            amount = getattr(structure, field, None)
            if amount and amount > 0:
                cat, _ = FeeCategory.objects.get_or_create(
                    name=label,
                    defaults={'is_optional': is_optional}
                )
                FeeComponent.objects.get_or_create(
                    fee_structure=structure,
                    category=cat,
                    defaults={'amount': amount}
                )


def reverse_fee_components(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('fees', '0001_initial'),
    ]

    operations = [
        # 1. Create FeeCategory
        migrations.CreateModel(
            name='FeeCategory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True)),
                ('description', models.TextField(blank=True)),
                ('is_optional', models.BooleanField(default=False)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={'ordering': ['name'], 'verbose_name_plural': 'Fee Categories'},
        ),

        # 2. Create FeeComponent
        migrations.CreateModel(
            name='FeeComponent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10, validators=[django.core.validators.MinValueValidator(0)])),
                ('fee_structure', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='components', to='fees.feestructure')),
                ('category', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='components', to='fees.feecategory')),
            ],
            options={'unique_together': {('fee_structure', 'category')}},
        ),

        # 3. Data migration: convert hardcoded columns → FeeCategory + FeeComponent rows
        migrations.RunPython(migrate_fee_components, reverse_fee_components),

        # 4. Remove old hardcoded fee columns
        migrations.RemoveField(model_name='feestructure', name='tuition_fee'),
        migrations.RemoveField(model_name='feestructure', name='library_fee'),
        migrations.RemoveField(model_name='feestructure', name='lab_fee'),
        migrations.RemoveField(model_name='feestructure', name='sports_fee'),
        migrations.RemoveField(model_name='feestructure', name='transport_fee'),
        migrations.RemoveField(model_name='feestructure', name='other_fee'),
    ]
