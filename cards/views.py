import re
import json
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST

from .models import Card


def extract_source(content, card_type):
    """Extract source from content — server-side, authoritative."""
    source = ''
    if card_type in ('quote', 'book'):
        match = re.search(r'\s*—\s*(.+)$', content)
        if match:
            source = match.group(1).strip()
    elif card_type == 'link':
        match = re.search(r'https?://(?:www\.)?([^/\s]+)', content)
        if match:
            source = match.group(1)
    return source


def clean_content(content, card_type):
    """Remove em-dash + source from content if present."""
    if card_type in ('quote', 'book'):
        content = re.sub(r'\s*—\s*.+$', '', content)
    return content.strip()


@login_required
def compose(request):
    if request.method == 'POST':
        raw_content = request.POST.get('content', '').strip()
        card_type = request.POST.get('card_type', 'note')

        source = extract_source(raw_content, card_type)
        content = clean_content(raw_content, card_type)

        if content:
            Card.objects.create(
                user=request.user,
                content=content,
                card_type=card_type,
                source=source,
            )

        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'ok': True, 'redirect': '/cards/'})
        return redirect('list')

    return render(request, 'cards/compose.html')


@login_required
def card_list(request):
    cards = Card.objects.filter(user=request.user).order_by('-created_at')
    alle = 'alle' in request.GET
    return render(request, 'cards/list.html', {'cards': cards, 'alle': alle})


@login_required
@require_POST
def delete_card(request, card_id):
    Card.objects.filter(id=card_id, user=request.user).delete()
    return JsonResponse({'ok': True})


@login_required
@require_POST
def reorder_cards(request):
    try:
        data = json.loads(request.body)
        ids = data.get('ids', [])
    except json.JSONDecodeError:
        return JsonResponse({'error': 'invalid json'}, status=400)

    cards = {c.id: c for c in Card.objects.filter(user=request.user, id__in=ids)}
    for i, card_id in enumerate(ids):
        if card_id in cards:
            cards[card_id].order = i
            cards[card_id].save(update_fields=['order'])

    return JsonResponse({'ok': True})


@login_required
@require_POST
def edit_card(request, card_id):
    try:
        data = json.loads(request.body)
        raw_content = data.get('content', '').strip()
    except json.JSONDecodeError:
        return JsonResponse({'error': 'invalid json'}, status=400)

    try:
        card = Card.objects.get(id=card_id, user=request.user)
    except Card.DoesNotExist:
        return JsonResponse({'error': 'not found'}, status=404)

    if raw_content:
        card.content = clean_content(raw_content, card.card_type)
        card.source = extract_source(raw_content, card.card_type)
        card.save()

    return JsonResponse({'ok': True})


@login_required
@require_POST
def analyse(request):
    """Claude API analysis endpoint — returns {card_type, source, meta}."""
    try:
        data = json.loads(request.body)
        content = data.get('content', '')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'invalid json'}, status=400)

    from .analyse import analyse_card
    result = analyse_card(content)
    return JsonResponse(result)
