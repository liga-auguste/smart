from django.db import models
from django.conf import settings


class UserOwnedModel(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Area(UserOwnedModel):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class Card(UserOwnedModel):
    TYPE_CHOICES = [
        ('note', 'Note'),
        ('quote', 'Quote'),
        ('book', 'Book'),
        ('link', 'Link'),
        ('fact', 'Fact'),
    ]

    content = models.TextField()
    card_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='note')
    source = models.CharField(max_length=500, blank=True)
    meta = models.JSONField(default=dict, blank=True)
    areas = models.ManyToManyField(Area, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.content[:60]
