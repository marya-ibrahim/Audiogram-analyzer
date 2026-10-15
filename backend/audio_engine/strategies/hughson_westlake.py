from .base import ThresholdStrategy
from .gpc_engine.gpc_strategy import GPCStrategy


class HughsonWestlakeStrategy(ThresholdStrategy):
    """
    خوارزمية Hughson-Westlake التقليدية
    تدعم الآن كلاً من الاختبار الهوائي (Air) والعظمي (Bone)
    """
    
    # الحد الأقصى لكل تردد عظمي حسب المعاير الطبية
    BONE_MAX_DB_PER_FREQ = {
        250: 45,
        500: 65,
        1000: 70,
        2000: 75,
        4000: 80,
        8000: 80,
    }

    def __init__(self, min_db: float = -10, max_db: float = 120, 
                 frequency: float = None, is_bone: bool = False, 
                 start_db: float = None):
        """
        Args:
            min_db: الحد الأدنى للديسيبل
            max_db: الحد الأقصى للديسيبل
            frequency: التردد الحالي
            is_bone: هل هذا اختبار عظمي؟
            start_db: نقطة البداية (تحكم بها اليدوي أو عبر has_hearing_loss)
        """
        self.min_db = min_db
        self.max_db = max_db
        self.frequency = frequency
        self.is_bone = is_bone
        
        # تحديد نقطة البداية إذا لم تمرر يدوياً
        if start_db is not None:
            self.start_db = start_db
        elif is_bone:
            # في العظمي، نبدأ عادة من 30dB إذا كان هناك اشتباه بضعف سمع
            # ولكن هنا نضع القيمة الافتراضية ويمكن تعديلها من الـ Factory
            self.start_db = 30.0 
        else:
            self.start_db = -10.0

    def calculate_next_db(self, current_db: float, heard: bool) -> float:
        """
        خوارزمية Hughson-Westlake:
        - إذا سمع: إنقص 10 ديسيبل
        - إذا لم يسمع: ارفع 5 ديسيبل
        """
        if heard:
            next_db = current_db - 10
        else:
            next_db = current_db + 5
        
        # الالتزام بالحدود
        return max(self.min_db, min(self.max_db, next_db))

    def is_threshold_reached(self, responses: list) -> float | None:
        """
        تحديد العتبة: الحصول على ردود فعل إيجابية في 2 من 3 مرات عند نفس الديسيبل
        """
        if len(responses) < 3:
            return None
        
        db_responses = {}
        for db, heard in responses:
            if db not in db_responses:
                db_responses[db] = {'heard': 0, 'total': 0}
            db_responses[db]['total'] += 1
            if heard:
                db_responses[db]['heard'] += 1
        
        # البحث عن العتبة
        for db, data in sorted(db_responses.items()):
            if data['total'] >= 3 and data['heard'] >= 2:
                return float(db)
        return None

    def get_limits(self) -> dict:
        return {
            'start_db': self.start_db,
            'min_db': self.min_db,
            'max_db': self.max_db,
            'step_down': 10,
            'step_up': 5,
            'required_correct': 2,
            'total_presentations': 3,
            'frequency': self.frequency,
            'algorithm': 'Hughson-Westlake',
        }


class StrategyFactory:
    """
    المصنع (Factory) المسؤول عن إنشاء الاستراتيجية المناسبة
    بناءً على نوع الجلسة (هوائي/عظمي) والخوارزمية المطلوبة
    """
    
    @staticmethod
    def get_strategy(
        session_type: str,
        algorithm: str = 'hughson_westlake',
        frequency: int = None,
        has_hearing_loss: bool = False
    ) -> ThresholdStrategy:
        """
        Args:
            session_type: 'air' للهوائي، 'bone' للعظمي
            algorithm: 'hughson_westlake' أو 'gaussian_process'
            frequency: التردد بالهيرتز
            has_hearing_loss: إذا كان True، تبدأ الخوارزمية من مستويات أعلى (30dB)
        """
        
        if algorithm == 'hughson_westlake':
            return StrategyFactory._get_hw_strategy(
                session_type, frequency, has_hearing_loss
            )
        
        elif algorithm == 'gaussian_process':
            return StrategyFactory._get_gpc_strategy(
                session_type, frequency, has_hearing_loss
            )
        
        else:
            raise ValueError(f"خوارزمية غير مدعومة: {algorithm}")

    @staticmethod
    def _get_hw_strategy(session_type: str, frequency: int, 
                         has_hearing_loss: bool) -> ThresholdStrategy:
        """تكوين خوارزمية Hughson-Westlake"""
        
        if session_type == 'air':
            # الهوائي: نطاق واسع -10 إلى 120
            return HughsonWestlakeStrategy(
                min_db=-10,
                max_db=120,
                frequency=frequency,
                is_bone=False,
                start_db=30.0 if has_hearing_loss else -10.0
            )
        
        elif session_type == 'bone':
            # العظمي: حدود مختلفة حسب التردد
            if frequency is None:
                raise ValueError('يجب تحديد التردد للاختبار العظمي')
            
            max_db = HughsonWestlakeStrategy.BONE_MAX_DB_PER_FREQ.get(frequency, 70)
            return HughsonWestlakeStrategy(
                min_db=-10,
                max_db=max_db,
                frequency=frequency,
                is_bone=True,
                start_db=30.0 if has_hearing_loss else 0.0  # العظمي غالباً يبدأ من 0 أو 30
            )
        
        else:
            raise ValueError(f"نوع الاختبار غير معروف: {session_type}")

    @staticmethod
    def _get_gpc_strategy(session_type: str, frequency: int,
                          has_hearing_loss: bool) -> GPCStrategy:
        """تكوين خوارزمية Gaussian Process"""
        
        start_db = 30.0 if has_hearing_loss else -10.0
        
        # تهيئة الخوارزمية
        strategy = GPCStrategy(
            current_frequency=frequency or 1000,
            start_db=start_db
        )
        
        if frequency:
            strategy.set_frequency(frequency)
        
        return strategy