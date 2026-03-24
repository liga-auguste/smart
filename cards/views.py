import json
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST

from .models import Card


@login_required
def compose(request):
    if request.method == 'POST':
        headline = request.POST.get('headline', '').strip()
        body = request.POST.get('body', '').strip()
        content = (headline + '\n' + body) if body else headline

        if content:
            Card.objects.create(user=request.user, content=content)

        return redirect('list')

    return render(request, 'cards/compose.html')


@login_required
def card_list(request):
    q = request.GET.get('q', '').strip()
    alle = 'alle' in request.GET
    cards = Card.objects.filter(user=request.user)
    if q:
        cards = cards.filter(content__icontains=q).order_by('-created_at')
        alle = True
    else:
        cards = cards.order_by('-created_at')
    return render(request, 'cards/list.html', {'cards': cards, 'alle': alle, 'q': q})


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
        content = data.get('content', '').strip()
    except json.JSONDecodeError:
        return JsonResponse({'error': 'invalid json'}, status=400)

    try:
        card = Card.objects.get(id=card_id, user=request.user)
    except Card.DoesNotExist:
        return JsonResponse({'error': 'not found'}, status=404)

    if content:
        card.content = content
        card.save()

    return JsonResponse({'ok': True})
