from rest_framework import serializers
from .models import TestSession, HearingResult


class HearingResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = HearingResult
        fields = ['id', 'frequency', 'threshold_db', 'current_db', 'is_completed']


class TestSessionSerializer(serializers.ModelSerializer):
    results = HearingResultSerializer(many=True, read_only=True)
    classification = serializers.SerializerMethodField()

    class Meta:
        model = TestSession
        fields = ['id', 'patient', 'audiologist', 'ear', 'session_type',
                  'status', 'strategy_type', 'has_hearing_loss', 'notes',
                  'created_at', 'results', 'classification']
        read_only_fields = ['id', 'created_at', 'status', 'patient']

    def get_classification(self, obj):
        return obj.classification


class ToneRequestSerializer(serializers.Serializer):
    frequency = serializers.ChoiceField(choices=[250, 500, 1000, 2000, 4000, 8000])
    db_hl = serializers.FloatField(min_value=-10, max_value=120)
    duration = serializers.FloatField(min_value=0.5, max_value=3.0, default=1.0)
    ear = serializers.ChoiceField(choices=['L', 'R'])