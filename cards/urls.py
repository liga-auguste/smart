from django.urls import path
from django.views.generic import RedirectView
from . import views

urlpatterns = [
    path('', RedirectView.as_view(url='/cards/'), name='home'),
    path('compose/', views.compose, name='compose'),
    path('cards/', views.card_list, name='list'),
    path('api/cards/<int:card_id>/edit/', views.edit_card, name='edit_card'),
    path('api/cards/<int:card_id>/delete/', views.delete_card, name='delete_card'),
    path('api/cards/reorder/', views.reorder_cards, name='reorder_cards'),
    path('stapel/', views.stapel_list, name='stapel'),
    path('api/stapel/reorder/', views.reorder_stapel, name='reorder_stapel'),
    path('api/stapel/create/', views.create_stapel, name='create_stapel'),
    path('api/stapel/rename/', views.rename_stapel, name='rename_stapel'),
    path('api/stapel/delete/', views.delete_stapel, name='delete_stapel'),
]
