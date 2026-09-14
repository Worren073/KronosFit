from django.urls import path
from . import views

urlpatterns = [
    path('chat/', views.ChatView.as_view(), name='ai_chat'),
    path('routines/generate/', views.GenerateRoutineView.as_view(), name='ai_routine_generate'),
]
