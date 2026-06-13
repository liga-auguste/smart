import json
from django.db.models import Max
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST

from .models import Card, Stapel


@login_required
def compose(request):
    if request.method == 'POST':
        headline = request.POST.get('headline', '').strip()
        body = request.POST.get('body', '').strip()
        stapel = request.POST.get('stapel', '').strip()
        content = (headline + '\n' + body) if body else headline

        if content:
            next_order = (Card.objects.filter(user=request.user).aggregate(Max('order'))['order__max'] or -1) + 1
            Card.objects.create(user=request.user, content=content, stapel=stapel, order=next_order)
            if stapel:
                Stapel.objects.get_or_create(user=request.user, name=stapel)

        if stapel:
            from django.urls import reverse
            return redirect(reverse('list') + f'?stapel={stapel}')
        return redirect('list')

    shared = ' '.join(filter(None, [
        request.GET.get('title', '').strip(),
        request.GET.get('text', '').strip(),
        request.GET.get('url', '').strip(),
    ]))
    preset_stapel = request.GET.get('stapel', '').strip()
    stapel_suggestions = list(dict.fromkeys(
        s.strip() for s in Card.objects.filter(user=request.user)
        .exclude(stapel='').values_list('stapel', flat=True) if s.strip()
    ))
    return render(request, 'cards/compose.html', {'shared': shared, 'stapel_suggestions': stapel_suggestions, 'preset_stapel': preset_stapel})


@login_required
def card_list(request):
    from collections import defaultdict
    q = request.GET.get('q', '').strip()
    stapel = request.GET.get('stapel', '').strip()
    alle = 'alle' in request.GET
    ohne_stapel = 'ohne_stapel' in request.GET
    zufaellig = 'zufaellig' in request.GET
    cards = Card.objects.filter(user=request.user)
    if q:
        cards = cards.filter(content__icontains=q).order_by('-created_at')
        alle = True
    elif zufaellig:
        cards = cards.order_by('?')
    else:
        cards = cards.order_by('order', '-created_at')
    if stapel:
        cards = cards.filter(stapel=stapel)
    elif ohne_stapel:
        cards = cards.filter(stapel='')
        alle = True
    model_stapel = list(Stapel.objects.filter(user=request.user).order_by('order', 'name').values_list('name', flat=True))
    card_stapel = set(
        s.strip() for s in Card.objects.filter(user=request.user)
        .exclude(stapel='').values_list('stapel', flat=True) if s.strip()
    )
    stapel_list = model_stapel + [s for s in card_stapel if s not in set(model_stapel)]
    cards_grouped = None
    if alle and not q and not stapel and not ohne_stapel and not zufaellig:
        groups = defaultdict(list)
        for card in cards:
            groups[card.stapel].append(card)
        all_stapel = Stapel.objects.filter(user=request.user)
        stapel_order = {s.name: s.order for s in all_stapel}
        all_names = {s.name for s in all_stapel}
        for name in all_names:
            if name not in groups:
                groups[name] = []
        named = sorted([(k, v) for k, v in groups.items() if k], key=lambda x: (stapel_order.get(x[0], 9999), x[0].lower()))
        if '' in groups:
            named.append(('', groups['']))
        cards_grouped = named
    return render(request, 'cards/list.html', {
        'cards': cards,
        'alle': alle,
        'q': q,
        'stapel': stapel,
        'stapel_list': stapel_list,
        'cards_grouped': cards_grouped,
        'ohne_stapel': ohne_stapel,
        'zufaellig': zufaellig,
    })


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
    to_update = []
    for i, card_id in enumerate(ids):
        if card_id in cards:
            cards[card_id].order = i
            to_update.append(cards[card_id])
    Card.objects.bulk_update(to_update, ['order'])

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
    if 'stapel' in data:
        card.stapel = data['stapel'].strip()
        if card.stapel:
            Stapel.objects.get_or_create(user=request.user, name=card.stapel)
    if content or 'stapel' in data:
        card.save()

    return JsonResponse({'ok': True})


@login_required
def stapel_list(request):
    from django.db.models import Count
    counts = {
        row['stapel']: row['count']
        for row in Card.objects.filter(user=request.user)
        .exclude(stapel='').values('stapel').annotate(count=Count('id'))
    }
    stapel_rows = [
        {'stapel': s.name, 'count': counts.get(s.name, 0)}
        for s in Stapel.objects.filter(user=request.user)
    ]
    return render(request, 'cards/stapel.html', {'stapel_rows': stapel_rows})


@login_required
@require_POST
def reorder_stapel(request):
    try:
        data = json.loads(request.body)
        names = data.get('names', [])
    except json.JSONDecodeError:
        return JsonResponse({'error': 'invalid json'}, status=400)
    stapel_map = {s.name: s for s in Stapel.objects.filter(user=request.user)}
    for i, name in enumerate(names):
        if name in stapel_map:
            stapel_map[name].order = i
    Stapel.objects.bulk_update(stapel_map.values(), ['order'])
    return JsonResponse({'ok': True})


@login_required
@require_POST
def create_stapel(request):
    try:
        data = json.loads(request.body)
        name = data.get('name', '').strip()
    except json.JSONDecodeError:
        return JsonResponse({'error': 'invalid json'}, status=400)
    if not name:
        return JsonResponse({'error': 'missing name'}, status=400)
    _, created = Stapel.objects.get_or_create(user=request.user, name=name)
    if not created:
        return JsonResponse({'error': 'exists'}, status=409)
    return JsonResponse({'ok': True, 'name': name, 'count': 0})


@login_required
@require_POST
def rename_stapel(request):
    try:
        data = json.loads(request.body)
        old_name = data.get('old_name', '').strip()
        new_name = data.get('new_name', '').strip()
    except json.JSONDecodeError:
        return JsonResponse({'error': 'invalid json'}, status=400)
    if not old_name or not new_name:
        return JsonResponse({'error': 'missing name'}, status=400)
    Card.objects.filter(user=request.user, stapel=old_name).update(stapel=new_name)
    Stapel.objects.filter(user=request.user, name=old_name).update(name=new_name)
    return JsonResponse({'ok': True})


@login_required
@require_POST
def delete_stapel(request):
    try:
        data = json.loads(request.body)
        name = data.get('name', '').strip()
    except json.JSONDecodeError:
        return JsonResponse({'error': 'invalid json'}, status=400)
    if not name:
        return JsonResponse({'error': 'missing name'}, status=400)
    Card.objects.filter(user=request.user, stapel=name).update(stapel='')
    Stapel.objects.filter(user=request.user, name=name).delete()
    return JsonResponse({'ok': True})
