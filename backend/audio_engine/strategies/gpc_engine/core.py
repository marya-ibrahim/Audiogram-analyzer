"""
GPC (Graduated Presentation Control) Engine Core
خوارزمية متكيفة تبدأ بخطوات كبيرة وتضيّق النطاق تدريجياً
"""


class GPCCore:
    """
    محرك GPC الأساسي — يتكيف مع استجابات المريض
    المرحلة 1: خطوات كبيرة (±10 dB) للوصول السريع للمنطقة
    المرحلة 2: خطوات صغيرة (±5 dB) للتدقيق في العتبة
    """

    PHASE_COARSE = 'coarse'  # تقريبي
    PHASE_FINE = 'fine'      # دقيق

    def __init__(self, min_db: float = -10, max_db: float = 120):
        self.min_db = min_db
        self.max_db = max_db
        self.phase = self.PHASE_COARSE
        self._reversals = 0  # عدد مرات تغيير الاتجاه

    def calculate_next_db(self, current_db: float, heard: bool, last_heard: bool | None) -> float:
        """حساب مستوى الصوت التالي بناءً على المرحلة الحالية."""
        # الانتقال للمرحلة الدقيقة بعد أول انعكاس
        if last_heard is not None and heard != last_heard:
            self._reversals += 1
            if self._reversals >= 1:
                self.phase = self.PHASE_FINE

        step_down = 10 if self.phase == self.PHASE_COARSE else 10
        step_up = 10 if self.phase == self.PHASE_COARSE else 5

        next_db = current_db - step_down if heard else current_db + step_up
        return float(max(self.min_db, min(self.max_db, next_db)))

    def is_threshold_reached(self, responses: list) -> float | None:
        """
        العتبة = أدنى مستوى سُمع في مرحلتين متتاليتين من مرحلة Fine
        """
        if self.phase != self.PHASE_FINE or len(responses) < 3:
            return None

        db_responses: dict[float, dict] = {}
        for db, heard in responses:
            if db not in db_responses:
                db_responses[db] = {'heard': 0, 'total': 0}
            db_responses[db]['total'] += 1
            if heard:
                db_responses[db]['heard'] += 1

        for db, data in db_responses.items():
            if data['total'] >= 3 and data['heard'] >= 2:
                return float(db)
        return None

    @property
    def reversals(self) -> int:
        return self._reversals
