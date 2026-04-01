from django.db import models
from django.conf import settings


class UserOwnedModel(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Stapel(UserOwnedModel):
    name = models.CharField(max_length=100)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = [('user', 'name')]
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class Card(UserOwnedModel):
    content = models.TextField()
    order = models.PositiveIntegerField(default=0)
    stapel = models.CharField(max_length=100, blank=True, default='')

    class Meta:
        ordering = ['order', '-created_at']

    def __str__(self):
        return self.content[:60]
