from .hughson_westlake import HughsonWestlakeStrategy
from .gpc_engine.gpc_strategy import GPCStrategy


class HearingContext:
    """
    المسؤول عن اختيار وتبديل خوارزميات فحص السمع (Context)
    """
    
    def __init__(self, strategy_type: str = "traditional"):
        """
        اختيار الخوارزمية بناءً على النوع
        
        Args:
            strategy_type: "traditional" لـ Hughson-Westlake أو "gpc" لـ Gaussian Process
        """
        # اختيار الخوارزمية بناءً على نوع الممر
        if strategy_type == "gpc":
            self.strategy = GPCStrategy()
        else:
            # هنا نستخدم الخوارزمية التقليدية الموجودة في ملفات hughson_westlake
            self.strategy = HughsonWestlakeStrategy()
    
    def calculate_next_db(self, current_db: float, heard: bool) -> float:
        """
        هذه الدالة الموحدة التي سيتم مناداتها من الـ View أو الـ Manager
        """
        return self.strategy.calculate_next_db(current_db, heard)
    
    def is_threshold_reached(self, responses: list):
        """
        التحقق مما إذا كانت الخوارزمية قد وصلت للحد النهائي (Threshold)
        """
        return self.strategy.is_threshold_reached(responses)
    
    def get_limits(self) -> dict:
        """
        الحصول على حدود الديسيل (Min/Max) الخاصة بالإستراتيجية الحالية
        """
        return self.strategy.get_limits()