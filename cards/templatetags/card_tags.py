import re
from django import template
from django.utils.html import escape
from django.utils.safestring import mark_safe

register = template.Library()

URL_RE = re.compile(r'(https?://[^\s<>"\']+)')


@register.filter
def headline(value):
    return value.split('\n')[0].strip()


@register.filter
def body(value):
    parts = value.split('\n', 1)
    return parts[1].strip() if len(parts) > 1 else ''


@register.filter
def linkify(value):
    escaped = escape(value)
    linked = URL_RE.sub(
        r'<a href="\1" target="_blank" rel="noopener noreferrer">\1</a>',
        escaped
    )
    return mark_safe(linked)
