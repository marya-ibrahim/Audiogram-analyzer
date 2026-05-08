"""
Performance Testing with Locust
Run: locust -f locustfile.py --host=http://localhost:8000
"""
from locust import HttpUser, task, between
import json


class AudiogramUser(HttpUser):
    wait_time = between(1, 3)
    token = None

    def on_start(self):
        """Login and get JWT token"""
        response = self.client.post('/api/users/login/', json={
            'username': 'testuser',
            'password': 'testpass123',
        })
        if response.status_code == 200:
            self.token = response.json().get('access')

    def get_headers(self):
        return {'Authorization': f'Bearer {self.token}'} if self.token else {}

    @task(3)
    def create_session(self):
        self.client.post('/api/audio/sessions/', json={
            'ear': 'R',
            'session_type': 'air',
            'strategy_type': 'traditional',
            'has_hearing_loss': False,
        }, headers=self.get_headers())

    @task(5)
    def get_history(self):
        self.client.get('/api/audio/my-history/', headers=self.get_headers())

    @task(2)
    def record_response(self):
        # Create session first
        r = self.client.post('/api/audio/sessions/', json={
            'ear': 'R', 'session_type': 'air',
            'strategy_type': 'traditional', 'has_hearing_loss': False,
        }, headers=self.get_headers())
        if r.status_code == 201:
            session_id = r.json()['id']
            self.client.post(f'/api/audio/sessions/{session_id}/respond/',
                json={'heard': True}, headers=self.get_headers())
