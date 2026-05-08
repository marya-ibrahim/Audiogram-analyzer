from django.urls import path
from .views import (
    GenerateToneView,
    TestSessionView,
    RecordResponseView,
    ClassifyView,
    AudiogramRenderView,
    CombinedAudiogramView,
    SessionHistoryView,
    ThresholdSubmitView,
    SaveResultsView,
    MyHistoryView,
)

urlpatterns = [
    path('generate-tone/', GenerateToneView.as_view(), name='generate-tone'),
    path('sessions/', TestSessionView.as_view(), name='create-session'),
    path('sessions/<int:session_id>/', TestSessionView.as_view(), name='get-session'),
    path('sessions/<int:session_id>/respond/', RecordResponseView.as_view(), name='record-response'),
    path('sessions/<int:session_id>/threshold/', ThresholdSubmitView.as_view(), name='submit-threshold'),
    path('sessions/<int:session_id>/classify/', ClassifyView.as_view(), name='classify'),
    path('sessions/<int:session_id>/audiogram/', AudiogramRenderView.as_view(), name='audiogram'),
    path('sessions/<int:session_id>/audiogram/combined/', CombinedAudiogramView.as_view(), name='audiogram-combined'),
    path('history/', SessionHistoryView.as_view(), name='my-history'),
    path('users/<int:user_id>/history/', SessionHistoryView.as_view(), name='session-history'),
    path('results/', SaveResultsView.as_view(), name='save-results'),
    path('my-history/', MyHistoryView.as_view(), name='my-history'),
]