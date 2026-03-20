from django.urls import path
from . import views

urlpatterns = [
    path('', views.compose, name='compose'),
    path('cards/', views.card_list, name='list'),
    path('api/analyse/', views.analyse, name='analyse'),
]
