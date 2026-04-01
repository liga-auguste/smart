from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from django.urls import reverse
from .models import Card

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
