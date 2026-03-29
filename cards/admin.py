from django.contrib import admin
from .models import Card


@admin.register(Card)
class CardAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'short_content', 'order', 'created_at')
    list_filter = ('user',)
    search_fields = ('content',)
    ordering = ('user', 'order', '-created_at')

    def short_content(self, obj):
        return obj.content[:60]
    short_content.short_description = 'content'
