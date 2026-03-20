from django import template

register = template.Library()


@register.filter
def headline(value):
    return value.split('\n')[0].strip()


@register.filter
def body(value):
    parts = value.split('\n', 1)
    return parts[1].strip() if len(parts) > 1 else ''
