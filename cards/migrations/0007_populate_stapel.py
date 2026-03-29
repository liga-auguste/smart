from django.db import migrations


def populate_stapel(apps, schema_editor):
    Card = apps.get_model('cards', 'Card')
    Stapel = apps.get_model('cards', 'Stapel')
    seen = set()
    for card in Card.objects.exclude(stapel=''):
        key = (card.user_id, card.stapel.strip())
        if key not in seen:
            seen.add(key)
            Stapel.objects.get_or_create(user_id=card.user_id, name=card.stapel.strip())


class Migration(migrations.Migration):

    dependencies = [
        ('cards', '0006_stapel'),
    ]

    operations = [
        migrations.RunPython(populate_stapel, migrations.RunPython.noop),
    ]
