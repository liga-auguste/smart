from django.urls import path
from . import views

urlpatterns = [
    path('', views.compose, name='compose'),
    path('cards/', views.card_list, name='list'),
    path('api/cards/<int:card_id>/edit/', views.edit_card, name='edit_card'),
    path('api/cards/<int:card_id>/delete/', views.delete_card, name='delete_card'),
    path('api/cards/reorder/', views.reorder_cards, name='reorder_cards'),
]
