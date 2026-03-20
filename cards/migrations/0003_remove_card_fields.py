from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('cards', '0002_card_order'),
    ]

    operations = [
        migrations.RemoveField(model_name='card', name='card_type'),
        migrations.RemoveField(model_name='card', name='source'),
        migrations.RemoveField(model_name='card', name='meta'),
    ]
