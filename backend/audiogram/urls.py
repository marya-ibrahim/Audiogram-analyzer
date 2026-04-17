from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token-obtain'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('api/users/', include('users.urls')),
    path('api/audio/', include('audio_engine.urls')),
]
