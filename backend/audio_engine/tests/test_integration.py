"""
Integration Tests — API Endpoints + Database
Tests real HTTP interactions with Django test client
"""
import pytest
import json
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from audio_engine.models import TestSession, HearingResult
from audio_engine.classification import classify_hearing

User = get_user_model()


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token)


class TestSessionAPIIntegration(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser', password='testpass123'
        )
        token = get_tokens_for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_create_air_session(self):
        response = self.client.post('/api/audio/sessions/', {
            'ear': 'R',
            'session_type': 'air',
            'strategy_type': 'traditional',
            'has_hearing_loss': False,
        })
        self.assertEqual(response.status_code, 201)
        self.assertIn('id', response.data)

    def test_create_bone_session(self):
        response = self.client.post('/api/audio/sessions/', {
            'ear': 'L',
            'session_type': 'bone',
            'strategy_type': 'traditional',
            'has_hearing_loss': True,
        })
        self.assertEqual(response.status_code, 201)

    def test_session_creates_hearing_results(self):
        response = self.client.post('/api/audio/sessions/', {
            'ear': 'R',
            'session_type': 'air',
            'strategy_type': 'traditional',
            'has_hearing_loss': False,
        })
        session_id = response.data['id']
        results = HearingResult.objects.filter(session_id=session_id)
        self.assertEqual(results.count(), 6)  # 6 air frequencies

    def test_submit_threshold(self):
        session = TestSession.objects.create(
            patient=self.user, ear='R', session_type='air', status='active'
        )
        HearingResult.objects.create(session=session, frequency=1000, current_db=40)
        response = self.client.post(f'/api/audio/sessions/{session.id}/threshold/', {
            'frequency': 1000,
            'threshold_db': 40,
        })
        self.assertEqual(response.status_code, 200)
        result = HearingResult.objects.get(session=session, frequency=1000)
        self.assertTrue(result.is_completed)
        self.assertEqual(result.threshold_db, 40)

    def test_submit_threshold_rejects_bad_values(self):
        session = TestSession.objects.create(patient=self.user, ear='R', session_type='air')
        r = self.client.post(f'/api/audio/sessions/{session.id}/threshold/',
                             {'frequency': 1234, 'threshold_db': 40})
        self.assertEqual(r.status_code, 400)
        r = self.client.post(f'/api/audio/sessions/{session.id}/threshold/',
                             {'frequency': 1000, 'threshold_db': 999})
        self.assertEqual(r.status_code, 400)

    def test_session_completes_when_all_thresholds_saved(self):
        r = self.client.post('/api/audio/sessions/', {
            'ear': 'R', 'session_type': 'air',
            'strategy_type': 'traditional', 'has_hearing_loss': False,
        })
        sid = r.data['id']
        for f in [250, 500, 1000, 2000, 4000, 8000]:
            resp = self.client.post(f'/api/audio/sessions/{sid}/threshold/',
                                    {'frequency': f, 'threshold_db': 20})
            self.assertEqual(resp.status_code, 200)
        self.assertEqual(TestSession.objects.get(id=sid).status, 'completed')
        self.assertEqual(self.client.get(f'/api/audio/sessions/{sid}/classify/').status_code, 200)

    def test_cannot_touch_another_users_session(self):
        other = User.objects.create_user(username='other', password='x12345678')
        session = TestSession.objects.create(patient=other, ear='R', session_type='air', status='completed')
        self.assertEqual(self.client.post(f'/api/audio/sessions/{session.id}/threshold/',
                                          {'frequency': 1000, 'threshold_db': 20}).status_code, 404)
        self.assertEqual(self.client.delete(f'/api/audio/sessions/{session.id}/').status_code, 404)
        self.assertEqual(len(self.client.get('/api/audio/my-history/').data), 0)

    def test_delete_own_session(self):
        session = TestSession.objects.create(patient=self.user, ear='R', session_type='air')
        self.assertEqual(self.client.delete(f'/api/audio/sessions/{session.id}/').status_code, 204)
        self.assertFalse(TestSession.objects.filter(id=session.id).exists())

    def test_classify_session(self):
        session = TestSession.objects.create(
            patient=self.user, ear='R', session_type='air', status='completed'
        )
        for freq, db in [(500, 30), (1000, 35), (2000, 30), (4000, 35)]:
            HearingResult.objects.create(
                session=session, frequency=freq,
                threshold_db=db, current_db=db, is_completed=True
            )
        response = self.client.get(f'/api/audio/sessions/{session.id}/classify/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('classification', response.data)
        self.assertEqual(response.data['classification'], 'Mild')

    def test_unauthenticated_request_rejected(self):
        unauth_client = APIClient()
        response = unauth_client.post('/api/audio/sessions/', {})
        self.assertEqual(response.status_code, 401)

    def test_my_history_returns_completed_sessions(self):
        TestSession.objects.create(
            patient=self.user, ear='R', session_type='air', status='completed'
        )
        response = self.client.get('/api/audio/my-history/')
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data), 1)

    def test_record_response_flow(self):
        response = self.client.post('/api/audio/sessions/', {
            'ear': 'R', 'session_type': 'air',
            'strategy_type': 'traditional', 'has_hearing_loss': False,
        })
        session_id = response.data['id']
        resp = self.client.post(f'/api/audio/sessions/{session_id}/respond/', {
            'heard': True
        })
        self.assertEqual(resp.status_code, 200)
        self.assertIn('current_db', resp.data)
