from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cards', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='card',
            name='order',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AlterModelOptions(
            name='card',
            options={'ordering': ['order', '-created_at']},
        ),
    ]
