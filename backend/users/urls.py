from django.urls import path
from .views import RegisterView, UserProfileView, UserDetailView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('me/', UserProfileView.as_view(), name='user-profile'),
    path('<int:user_id>/', UserDetailView.as_view(), name='user-detail'),
]