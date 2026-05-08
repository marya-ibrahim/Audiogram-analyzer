from django.db import models
from django.conf import settings
from .classification import classify_hearing


FREQUENCY_CHOICES = [(f, f"{f} Hz") for f in [250, 500, 1000, 2000, 4000, 8000]]


# ── TestSession model — one test session per ear/type ────────────
class TestSession(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    SESSION_TYPE_CHOICES = [
        ('air', 'Air Conduction'),
        ('bone', 'Bone Conduction'),
    ]
    EAR_CHOICES = [
        ('L', 'Left'),
        ('R', 'Right'),
    ]

    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='test_sessions',
    )
    audiologist = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='conducted_test_sessions',
    )
    ear = models.CharField(max_length=1, choices=EAR_CHOICES)
    session_type = models.CharField(max_length=10, choices=SESSION_TYPE_CHOICES, default='air')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='active')
    strategy_type = models.CharField(max_length=20, default='traditional')
    has_hearing_loss = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Session #{self.pk} - {self.patient} ({self.ear}, {self.session_type})"

    @property
    def thresholds_dict(self):
        # Return completed thresholds as {frequency: threshold_db}
        return {r.frequency: r.threshold_db for r in self.results.filter(is_completed=True)}

    @property
    def classification(self):
        # Classify hearing based on completed thresholds
        thresholds = self.thresholds_dict
        return classify_hearing(thresholds) if thresholds else None


class HearingResult(models.Model):
    # ── HearingResult model — one row per frequency per session ──
    session = models.ForeignKey(
        TestSession,
        on_delete=models.CASCADE,
        related_name='results',
    )
    frequency = models.IntegerField(choices=FREQUENCY_CHOICES)
    threshold_db = models.FloatField(null=True, blank=True, help_text="Final threshold in dB HL")
    current_db = models.FloatField(default=40.0, help_text="Current test level in dB HL")
    is_completed = models.BooleanField(default=False)

    class Meta:
        unique_together = ('session', 'frequency')
        ordering = ['frequency']

    def __str__(self):
        status = f"{self.threshold_db} dB" if self.is_completed else f"in progress @ {self.current_db} dB"
        return f"{self.frequency} Hz: {status}"
