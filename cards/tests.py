import json
from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from django.urls import reverse
from .models import Card, Stapel
from .templatetags.card_tags import linkify

SIMPLE_STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
}


@override_settings(STORAGES=SIMPLE_STORAGES)
class LoginRequiredTest(TestCase):
    def test_list_redirects_anonymous(self):
        response = self.client.get(reverse('list'))
        self.assertRedirects(response, f'/login/?next={reverse("list")}',
                             fetch_redirect_response=False)

    def test_compose_redirects_anonymous(self):
        response = self.client.get(reverse('compose'))
        self.assertRedirects(response, f'/login/?next={reverse("compose")}',
                             fetch_redirect_response=False)

    def test_delete_redirects_anonymous(self):
        response = self.client.post(reverse('delete_card', args=[1]))
        self.assertEqual(response.status_code, 302)


@override_settings(STORAGES=SIMPLE_STORAGES)
class CardCreateTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='test', password='test')
        self.client.login(username='test', password='test')

    def test_create_card(self):
        self.client.post(reverse('compose'), {'headline': 'Test', 'body': '', 'stapel': ''})
        self.assertEqual(Card.objects.filter(user=self.user).count(), 1)

    def test_create_card_with_body(self):
        self.client.post(reverse('compose'), {'headline': 'Title', 'body': 'Body text', 'stapel': ''})
        card = Card.objects.get(user=self.user)
        self.assertIn('Title', card.content)
        self.assertIn('Body text', card.content)

    def test_empty_card_not_saved(self):
        self.client.post(reverse('compose'), {'headline': '', 'body': '', 'stapel': ''})
        self.assertEqual(Card.objects.filter(user=self.user).count(), 0)

    def test_create_redirects_to_list(self):
        response = self.client.post(reverse('compose'), {'headline': 'Test', 'body': '', 'stapel': ''})
        self.assertRedirects(response, reverse('list'), fetch_redirect_response=False)


@override_settings(STORAGES=SIMPLE_STORAGES)
class CardDeleteTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='test', password='test')
        self.other = User.objects.create_user(username='other', password='other')
        self.client.login(username='test', password='test')
        self.card = Card.objects.create(user=self.user, content='Test')

    def test_delete_card(self):
        self.client.post(reverse('delete_card', args=[self.card.id]))
        self.assertFalse(Card.objects.filter(id=self.card.id).exists())

    def test_cannot_delete_other_users_card(self):
        other_card = Card.objects.create(user=self.other, content='Other')
        self.client.post(reverse('delete_card', args=[other_card.id]))
        self.assertTrue(Card.objects.filter(id=other_card.id).exists())


@override_settings(STORAGES=SIMPLE_STORAGES)
class CardEditTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='test', password='test')
        self.other = User.objects.create_user(username='other', password='other')
        self.client.login(username='test', password='test')
        self.card = Card.objects.create(user=self.user, content='Alt')

    def post(self, card_id, data):
        return self.client.post(
            reverse('edit_card', args=[card_id]),
            data=json.dumps(data),
            content_type='application/json'
        )

    def test_edit_content(self):
        self.post(self.card.id, {'content': 'Neu'})
        self.card.refresh_from_db()
        self.assertEqual(self.card.content, 'Neu')

    def test_edit_stapel(self):
        self.post(self.card.id, {'stapel': 'Inspo'})
        self.card.refresh_from_db()
        self.assertEqual(self.card.stapel, 'Inspo')

    def test_cannot_edit_other_users_card(self):
        other_card = Card.objects.create(user=self.other, content='Fremd')
        response = self.post(other_card.id, {'content': 'Hack'})
        self.assertEqual(response.status_code, 404)
        other_card.refresh_from_db()
        self.assertEqual(other_card.content, 'Fremd')

    def test_invalid_json_returns_400(self):
        response = self.client.post(
            reverse('edit_card', args=[self.card.id]),
            data='kein json',
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)


@override_settings(STORAGES=SIMPLE_STORAGES)
class CardReorderTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='test', password='test')
        self.client.login(username='test', password='test')
        self.c1 = Card.objects.create(user=self.user, content='A', order=0)
        self.c2 = Card.objects.create(user=self.user, content='B', order=1)
        self.c3 = Card.objects.create(user=self.user, content='C', order=2)

    def test_reorder(self):
        self.client.post(
            reverse('reorder_cards'),
            data=json.dumps({'ids': [self.c3.id, self.c1.id, self.c2.id]}),
            content_type='application/json'
        )
        self.c1.refresh_from_db()
        self.c3.refresh_from_db()
        self.assertEqual(self.c3.order, 0)
        self.assertEqual(self.c1.order, 1)

    def test_ignores_other_users_cards(self):
        other = User.objects.create_user(username='other', password='other')
        other_card = Card.objects.create(user=other, content='X', order=0)
        self.client.post(
            reverse('reorder_cards'),
            data=json.dumps({'ids': [other_card.id]}),
            content_type='application/json'
        )
        other_card.refresh_from_db()
        self.assertEqual(other_card.order, 0)


@override_settings(STORAGES=SIMPLE_STORAGES)
class StapelApiTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='test', password='test')
        self.other = User.objects.create_user(username='other', password='other')
        self.client.login(username='test', password='test')
        self.stapel = Stapel.objects.create(user=self.user, name='Inspo')
        self.card = Card.objects.create(user=self.user, content='Test', stapel='Inspo')

    def post(self, url_name, data):
        return self.client.post(
            reverse(url_name),
            data=json.dumps(data),
            content_type='application/json'
        )

    def test_rename_stapel(self):
        self.post('rename_stapel', {'old_name': 'Inspo', 'new_name': 'Quotes'})
        self.card.refresh_from_db()
        self.assertEqual(self.card.stapel, 'Quotes')
        self.assertTrue(Stapel.objects.filter(user=self.user, name='Quotes').exists())

    def test_delete_stapel(self):
        self.post('delete_stapel', {'name': 'Inspo'})
        self.card.refresh_from_db()
        self.assertEqual(self.card.stapel, '')
        self.assertFalse(Stapel.objects.filter(user=self.user, name='Inspo').exists())

    def test_create_stapel(self):
        response = self.post('create_stapel', {'name': 'Neu'})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(Stapel.objects.filter(user=self.user, name='Neu').exists())

    def test_create_duplicate_stapel_returns_409(self):
        response = self.post('create_stapel', {'name': 'Inspo'})
        self.assertEqual(response.status_code, 409)

    def test_cannot_rename_other_users_stapel(self):
        other_stapel = Stapel.objects.create(user=self.other, name='Inspo')
        other_card = Card.objects.create(user=self.other, content='X', stapel='Inspo')
        self.post('rename_stapel', {'old_name': 'Inspo', 'new_name': 'Hack'})
        other_card.refresh_from_db()
        self.assertEqual(other_card.stapel, 'Inspo')


@override_settings(STORAGES=SIMPLE_STORAGES)
class CardListTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='test', password='test')
        self.client.login(username='test', password='test')

    def test_list_returns_200(self):
        response = self.client.get(reverse('list'))
        self.assertEqual(response.status_code, 200)

    def test_list_only_shows_own_cards(self):
        other = User.objects.create_user(username='other', password='other')
        Card.objects.create(user=self.user, content='Mine')
        Card.objects.create(user=other, content='Theirs')
        response = self.client.get(reverse('list'))
        cards = response.context['cards']
        self.assertTrue(all(c.user == self.user for c in cards))


class LinkifyTest(TestCase):
    def test_url_becomes_link(self):
        result = linkify('check https://example.com out')
        self.assertIn('<a href="https://example.com"', result)

    def test_plain_text_unchanged(self):
        result = linkify('kein link hier')
        self.assertEqual(result, 'kein link hier')

    def test_xss_escaped(self):
        result = linkify('<script>alert(1)</script>')
        self.assertNotIn('<script>', result)

    def test_rel_noopener(self):
        result = linkify('https://example.com')
        self.assertIn('rel="noopener noreferrer"', result)
