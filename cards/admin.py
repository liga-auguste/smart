from django.contrib import admin
from django.contrib.auth import get_user_model
from django.db.models import Count
from .models import Card


class StapelFilter(admin.SimpleListFilter):
    title = 'stapel'
    parameter_name = 'stapel'

    def lookups(self, request, model_admin):
        stapel = model_admin.get_queryset(request).exclude(stapel='').values_list('stapel', flat=True).distinct().order_by('stapel')
        return [('__keine__', 'kein stapel')] + [(s, s) for s in stapel]

    def queryset(self, request, queryset):
        if self.value() == '__keine__':
            return queryset.filter(stapel='')
        if self.value():
            return queryset.filter(stapel=self.value())
        return queryset

User = get_user_model()


@admin.register(Card)
class CardAdmin(admin.ModelAdmin):
    list_display = ('id', 'nutzer', 'stapel', 'short_content', 'reihenfolge', 'erstellt')
    list_filter = ('user', StapelFilter)
    search_fields = ('content',)
    ordering = ('user', 'stapel', 'order', '-created_at')

    def nutzer(self, obj):
        return obj.user
    nutzer.short_description = 'nutzer'
    nutzer.admin_order_field = 'user'

    def short_content(self, obj):
        return obj.content[:60]
    short_content.short_description = 'inhalt'

    def reihenfolge(self, obj):
        return obj.order
    reihenfolge.short_description = 'reihenfolge'
    reihenfolge.admin_order_field = 'order'

    def erstellt(self, obj):
        return obj.created_at
    erstellt.short_description = 'erstellt'
    erstellt.admin_order_field = 'created_at'

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context['title'] = 'Karten'
        return super().changelist_view(request, extra_context=extra_context)


class UserCardStatsAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'card_count')

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(card_count=Count('card'))

    def username(self, obj):
        return obj.username
    username.short_description = 'nutzername'
    username.admin_order_field = 'username'

    def email(self, obj):
        return obj.email
    email.short_description = 'e-mail'
    email.admin_order_field = 'email'

    def card_count(self, obj):
        return obj.card_count
    card_count.admin_order_field = 'card_count'
    card_count.short_description = 'karten'

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context['title'] = 'Karten pro Nutzer'
        return super().changelist_view(request, extra_context=extra_context)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


class UserCardStatsProxy(User):
    class Meta:
        proxy = True
        verbose_name = 'karten pro nutzer'
        verbose_name_plural = 'karten pro nutzer'


admin.site.register(UserCardStatsProxy, UserCardStatsAdmin)
