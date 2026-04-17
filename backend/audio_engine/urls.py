from django.urls import path
from .views import (
    GenerateToneView,
    TestSessionView,
    RecordResponseView,
    NextStepView,
    ClassifyView,
    AudiogramRenderView,
    CombinedAudiogramView,
    SessionHistoryView,
)

urlpatterns = [
    path('generate-tone/', GenerateToneView.as_view(), name='generate-tone'),
    path('sessions/', TestSessionView.as_view(), name='create-session'),
    path('sessions/<int:session_id>/', TestSessionView.as_view(), name='get-session'),
    path('sessions/<int:session_id>/respond/', RecordResponseView.as_view(), name='record-response'),
    path('sessions/<int:session_id>/next-step/', NextStepView.as_view(), name='next-step'),
    path('sessions/<int:session_id>/classify/', ClassifyView.as_view(), name='classify'),
    path('sessions/<int:session_id>/audiogram/', AudiogramRenderView.as_view(), name='audiogram'),
    path('sessions/<int:session_id>/audiogram/combined/', CombinedAudiogramView.as_view(), name='audiogram-combined'),
    path('users/<int:user_id>/history/', SessionHistoryView.as_view(), name='session-history'),
]