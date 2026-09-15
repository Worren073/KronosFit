from django.db import migrations


def migrate_existing_routines(apps, schema_editor):
    Routine = apps.get_model('routines', 'Routine')
    Routine.objects.update(source='ai')


def reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('routines', '0003_remove_routine_generated_by_ai_routine_source'),
    ]

    operations = [
        migrations.RunPython(migrate_existing_routines, reverse),
    ]
