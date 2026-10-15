"""Main URL configuration for Audiogram Analyzer."""
from django.contrib import admin
from django.urls import path, include
from users.views import user_login, token_refresh

urlpatterns = [
    path('admin/', admin.site.urls),
    # Auth endpoints expected by frontend
    path('api/auth/login/', user_login, name='login'),
    path('api/auth/refresh/', token_refresh, name='token_refresh'),
    # App routes
    path('api/users/', include('users.urls')),
    path('api/audio/', include('audio_engine.urls')),
]
