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

# تخزين مؤقت للجلسات النشطة في الذاكرة
active_sessions: dict[int, SessionManager] = {}


class GenerateToneView(APIView):
    """POST /api/audio/generate-tone/ — يولد نغمة نقية ويرجعها كـ base64"""
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
    POST /api/audio/sessions/       — إنشاء جلسة جديدة
    GET  /api/audio/sessions/{id}/  — عرض جلسة
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TestSessionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        session = serializer.save(patient=request.user)

        # إنشاء سجلات النتائج لكل تردد
        freqs = AUDIOGRAM_FREQUENCIES if session.session_type == 'air' else [250, 500, 1000, 2000, 4000]
        HearingResult.objects.bulk_create([
            HearingResult(session=session, frequency=freq, current_db=40.0)
            for freq in freqs
        ])

        return Response(TestSessionSerializer(session).data, status=status.HTTP_201_CREATED)

    def get(self, request, session_id):
        try:
            session = TestSession.objects.get(id=session_id, patient=request.user)
            return Response(TestSessionSerializer(session).data)
        except TestSession.DoesNotExist:
            return Response({'error': 'الجلسة غير موجودة'}, status=status.HTTP_404_NOT_FOUND)


class RecordResponseView(APIView):
    """POST /api/audio/sessions/{id}/respond/ — تسجيل استجابة المريض"""
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        heard = request.data.get('heard')
        if heard is None:
            return Response({'error': 'heard مطلوب'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            session = TestSession.objects.get(id=session_id, patient=request.user)
        except TestSession.DoesNotExist:
            return Response({'error': 'الجلسة غير موجودة'}, status=status.HTTP_404_NOT_FOUND)

        if session.status == 'completed':
            return Response({'error': 'الجلسة مكتملة بالفعل'}, status=status.HTTP_400_BAD_REQUEST)

        if session_id not in active_sessions:
            active_sessions[session_id] = SessionManager(
                session_id=session_id,
                ear=session.ear,
                session_type=session.session_type,
                has_hearing_loss=session.has_hearing_loss,
            )

        manager = active_sessions[session_id]
        result = manager.record_response(heard=bool(heard))

        # حفظ العتبة عند اكتمال التردد (بما فيها الأخير عند اكتمال الجلسة)
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

            # --- منطق القرار التلقائي ---
            air_classification = classify_hearing(session.thresholds_dict)
            pta = air_classification.get('pta')

            # إذا كانت الجلسة هوائية وكان PTA > 25 → ننشئ جلسة عظمية تلقائياً
            if session.session_type == 'air' and pta is not None and pta > 25:
                bone_session = TestSession.objects.create(
                    patient=session.patient,
                    audiologist=session.audiologist,
                    ear=session.ear,
                    session_type='bone',
                    strategy_type=session.strategy_type,
                    has_hearing_loss=True,
                )
                HearingResult.objects.bulk_create([
                    HearingResult(session=bone_session, frequency=freq, current_db=30.0)
                    for freq in [250, 500, 1000, 2000, 4000]
                ])
                result['requires_bone'] = True
                result['bone_session_id'] = bone_session.id
                result['air_classification'] = air_classification
            else:
                result['requires_bone'] = False
                result['air_classification'] = air_classification

            # إذا كانت الجلسة عظمية → نحدد نوع الفقدان مقارنةً بالهوائي
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


class NextStepView(RecordResponseView):
    """POST /api/audio/sessions/{id}/next-step/ — alias لـ RecordResponseView"""
    pass


class ClassifyView(APIView):
    """GET /api/audio/sessions/{id}/classify/ — تصنيف نتائج الجلسة"""
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        try:
            session = TestSession.objects.get(id=session_id, patient=request.user)
        except TestSession.DoesNotExist:
            return Response({'error': 'الجلسة غير موجودة'}, status=status.HTTP_404_NOT_FOUND)

        thresholds = session.thresholds_dict
        if not thresholds:
            return Response({'error': 'لا توجد نتائج مكتملة بعد'}, status=status.HTTP_400_BAD_REQUEST)

        return Response(classify_hearing(thresholds))


class AudiogramRenderView(APIView):
    """GET /api/audio/sessions/{id}/audiogram/ — بيانات رسم الأوديوغرام"""
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        try:
            session = TestSession.objects.get(id=session_id, patient=request.user)
        except TestSession.DoesNotExist:
            return Response({'error': 'الجلسة غير موجودة'}, status=status.HTTP_404_NOT_FOUND)

        thresholds = session.thresholds_dict
        if not thresholds:
            return Response({'error': 'لا توجد نتائج مكتملة بعد'}, status=status.HTTP_400_BAD_REQUEST)

        return Response(render_audiogram(thresholds, session.ear))


class CombinedAudiogramView(APIView):
    """
    GET /api/audio/sessions/{id}/audiogram/combined/
    يجمع مسار الهوائي والعظمي في مخطط واحد.
    يُمرر session_id للجلسة العظمية — يجلب الهوائي تلقائياً.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        try:
            bone_session = TestSession.objects.get(
                id=session_id, patient=request.user, session_type='bone'
            )
        except TestSession.DoesNotExist:
            return Response({'error': 'جلسة عظمية غير موجودة'}, status=status.HTTP_404_NOT_FOUND)

        # جلب الجلسة الهوائية المقابلة تلقائياً
        air_session = (
            TestSession.objects
            .filter(patient=request.user, ear=bone_session.ear, session_type='air', status='completed')
            .order_by('-created_at')
            .first()
        )
        if not air_session:
            return Response({'error': 'لا توجد جلسة هوائية مكتملة لهذه الأذن'}, status=status.HTTP_404_NOT_FOUND)

        air_thresholds = air_session.thresholds_dict
        bone_thresholds = bone_session.thresholds_dict

        if not bone_thresholds:
            return Response({'error': 'الجلسة العظمية لم تكتمل بعد'}, status=status.HTTP_400_BAD_REQUEST)

        return Response(render_combined(air_thresholds, bone_thresholds, bone_session.ear))


class SessionHistoryView(APIView):
    """GET /api/audio/users/{id}/history/ — تاريخ جلسات المستخدم"""
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        if request.user.id != user_id and request.user.role != 'audiologist':
            return Response({'error': 'غير مصرح'}, status=status.HTTP_403_FORBIDDEN)

        sessions = TestSession.objects.filter(patient_id=user_id).prefetch_related('results')
        return Response(TestSessionSerializer(sessions, many=True).data)
