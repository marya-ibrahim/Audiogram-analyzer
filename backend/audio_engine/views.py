import base64
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import TestSession, HearingResult
from .serializers import TestSessionSerializer, ToneRequestSerializer
from .tone_generator import generate_tone_wav, AUDIOGRAM_FREQUENCIES
from .session_manager import SessionManager
from .classification import classify_hearing, classify_loss_type
from .audiogram_renderer import render_audiogram, render_combined

# In-memory cache of active sessions (keyed by session ID)
active_sessions: dict[int, SessionManager] = {}


class GenerateToneView(APIView):
    """POST /api/audio/generate-tone/ — Generates a pure tone and returns it as base64"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ToneRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        wav_bytes = generate_tone_wav(
            frequency=data['frequency'],
            db_hl=data['db_hl'],
            duration=data['duration'],
        )
        return Response({
            'audio': base64.b64encode(wav_bytes).decode('utf-8'),
            'format': 'wav',
            'frequency': data['frequency'],
            'db_hl': data['db_hl'],
            'ear': data['ear'],
        })


class TestSessionView(APIView):
    """
    POST /api/audio/sessions/       — Create new session
    GET  /api/audio/sessions/{id}/  — View session
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TestSessionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        session = serializer.save(patient=request.user)

        # Create result records for each frequency
        freqs = AUDIOGRAM_FREQUENCIES if session.session_type == 'air' else [250, 500, 1000, 2000, 4000]
        HearingResult.objects.bulk_create([
            HearingResult(session=session, frequency=freq, current_db=30.0)
            for freq in freqs
        ])

        return Response(TestSessionSerializer(session).data, status=status.HTTP_201_CREATED)

    def get(self, request, session_id):
        try:
            session = TestSession.objects.get(id=session_id, patient=request.user)
            return Response(TestSessionSerializer(session).data)
        except TestSession.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, session_id):
        try:
            session = TestSession.objects.get(id=session_id, patient=request.user)
            session.delete()
            return Response({'ok': True}, status=status.HTTP_204_NO_CONTENT)
        except TestSession.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)


class RecordResponseView(APIView):
    """POST /api/audio/sessions/{id}/respond/ — Record patient response"""
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        heard = request.data.get('heard')
        if heard is None:
            return Response({'error': 'heard is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            session = TestSession.objects.get(id=session_id, patient=request.user)
        except TestSession.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

        if session.status == 'completed':
            return Response({'error': 'Session is already completed'}, status=status.HTTP_400_BAD_REQUEST)

        if session_id not in active_sessions:
            active_sessions[session_id] = SessionManager(
                session_id=session_id,
                ear=session.ear,
                session_type=session.session_type,
                algorithm=session.strategy_type or 'hughson_westlake',
                has_hearing_loss=session.has_hearing_loss,
            )

        manager = active_sessions[session_id]
        result = manager.record_response(heard=bool(heard))

        # Save threshold when a frequency is complete (including the last one when session completes)
        if result.get('is_complete'):
            HearingResult.objects.update_or_create(
                session_id=session_id,
                frequency=result['frequency'],
                defaults={'threshold_db': result['threshold'], 'is_completed': True},
            )

        if result.get('session_complete'):
            session.status = 'completed'
            session.save()
            active_sessions.pop(session_id, None)

            # --- Auto-decision logic ---
            air_classification = classify_hearing(session.thresholds_dict)
            pta = air_classification.get('pta')

            # If air session and PTA > 25 → notify frontend only (do not auto-create bone session)
            if session.session_type == 'air' and pta is not None and pta > 25:
                result['requires_bone'] = True
                result['air_classification'] = air_classification
            else:
                result['requires_bone'] = False
                result['air_classification'] = air_classification

            # If bone session → determine loss type compared to air session
            if session.session_type == 'bone':
                air_session = (
                    TestSession.objects
                    .filter(patient=session.patient, ear=session.ear, session_type='air', status='completed')
                    .order_by('-created_at')
                    .first()
                )
                if air_session:
                    loss_type = classify_loss_type(
                        air_thresholds=air_session.thresholds_dict,
                        bone_thresholds=session.thresholds_dict,
                    )
                    result['loss_type'] = loss_type

        return Response(result)


class ThresholdSubmitView(APIView):
    """POST /api/audio/sessions/{id}/threshold/ — Save threshold for a single frequency"""
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        frequency    = request.data.get('frequency')
        threshold_db = request.data.get('threshold_db')

        if frequency is None or threshold_db is None:
            return Response({'error': 'frequency and threshold_db are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            session = TestSession.objects.get(id=session_id, patient=request.user)
        except TestSession.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

        HearingResult.objects.update_or_create(
            session=session,
            frequency=frequency,
            defaults={'threshold_db': threshold_db, 'is_completed': True, 'current_db': threshold_db},
        )

        # Mark session complete when all created results are done
        total = session.results.count()
        done  = session.results.filter(is_completed=True).count()
        if total > 0 and done >= total:
            session.status = 'completed'
            session.save()

        return Response({'ok': True, 'frequency': frequency, 'threshold_db': threshold_db})


class SaveResultsView(APIView):
    """POST /api/audio/results/ — Save complete test results in one batch"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ear          = request.data.get('ear')          # 'left' or 'right'
        session_type = request.data.get('session_type', 'air')
        thresholds   = request.data.get('thresholds', {})  # {250: 30, 500: 35, ...}

        if not ear or not thresholds:
            return Response({'error': 'ear and thresholds are required'}, status=status.HTTP_400_BAD_REQUEST)

        ear_code = 'L' if ear == 'left' else 'R'

        # Create the session
        session = TestSession.objects.create(
            patient=request.user,
            ear=ear_code,
            session_type=session_type,
            status='completed',
            strategy_type='traditional',
        )

        # Save thresholds for each frequency
        for freq, threshold in thresholds.items():
            HearingResult.objects.create(
                session=session,
                frequency=int(freq),
                threshold_db=float(threshold),
                current_db=float(threshold),
                is_completed=True,
            )

        # Classify hearing based on submitted thresholds
        classification = classify_hearing({int(k): v for k, v in thresholds.items()})

        return Response({
            'session_id': session.id,
            **classification,
        }, status=status.HTTP_201_CREATED)


class MyHistoryView(APIView):
    """GET /api/audio/my-history/ — Current user's session history"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = (
            TestSession.objects
            .filter(patient=request.user, status='completed')
            .prefetch_related('results')
            .order_by('-created_at')
        )
        # Only return sessions with at least one completed result
        data = []
        for s in sessions:
            thresholds = s.thresholds_dict
            if not thresholds:
                continue  # Skip empty sessions
            classification = classify_hearing(thresholds)
            data.append({
                'id':              s.id,
                'date':            s.created_at.isoformat(),
                'ear':             'left' if s.ear == 'L' else 'right',
                'session_type':    s.session_type,
                'strategy_type':   s.strategy_type,
                'results':         thresholds,
                'avg_threshold':   classification.get('pta'),
                'hearing_level':   classification.get('classification'),
                'classification_ar': classification.get('classification_ar'),
            })
        return Response(data)


class ClassifyView(APIView):
    """GET /api/audio/sessions/{id}/classify/ — Classify session results"""
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        try:
            session = TestSession.objects.get(id=session_id, patient=request.user)
        except TestSession.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

        thresholds = session.thresholds_dict
        if not thresholds:
            return Response({'error': 'No completed results yet'}, status=status.HTTP_400_BAD_REQUEST)

        # Auto-complete session if all submitted thresholds are done
        if session.status != 'completed':
            session.status = 'completed'
            session.save()

        return Response(classify_hearing(thresholds))


class AudiogramRenderView(APIView):
    """GET /api/audio/sessions/{id}/audiogram/ — Audiogram chart data"""
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        try:
            session = TestSession.objects.get(id=session_id, patient=request.user)
        except TestSession.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

        thresholds = session.thresholds_dict
        if not thresholds:
            return Response({'error': 'No completed results yet'}, status=status.HTTP_400_BAD_REQUEST)

        return Response(render_audiogram(thresholds, session.ear))


class CombinedAudiogramView(APIView):
    """
    GET /api/audio/sessions/{id}/audiogram/combined/
    Combines air and bone conduction paths in one chart.
    Pass the bone session_id — air session is fetched automatically.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        try:
            bone_session = TestSession.objects.get(
                id=session_id, patient=request.user, session_type='bone'
            )
        except TestSession.DoesNotExist:
            return Response({'error': 'Bone session not found'}, status=status.HTTP_404_NOT_FOUND)

        # Automatically fetch the matching air session for the same ear
        air_session = (
            TestSession.objects
            .filter(patient=request.user, ear=bone_session.ear, session_type='air', status='completed')
            .order_by('-created_at')
            .first()
        )
        if not air_session:
            return Response({'error': 'No completed air session found for this ear'}, status=status.HTTP_404_NOT_FOUND)

        air_thresholds = air_session.thresholds_dict
        bone_thresholds = bone_session.thresholds_dict

        if not bone_thresholds:
            return Response({'error': 'Bone session is not yet complete'}, status=status.HTTP_400_BAD_REQUEST)

        return Response(render_combined(air_thresholds, bone_thresholds, bone_session.ear))


class SessionHistoryView(APIView):
    """GET /api/audio/history/ — Current user's session history"""
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id=None):
        # If no user_id provided, use the current user
        target_id = user_id if user_id else request.user.id
        if target_id != request.user.id and request.user.role != 'audiologist':
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        sessions = (TestSession.objects
                    .filter(patient_id=target_id, status='completed')
                    .prefetch_related('results')
                    .order_by('-created_at'))
        return Response(TestSessionSerializer(sessions, many=True).data)
