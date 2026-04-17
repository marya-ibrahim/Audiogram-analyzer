from ..base import ThresholdStrategy
from .core import GPCCore


class GPCStrategy(ThresholdStrategy):
    """
    استراتيجية GPC — تستخدم GPCCore للتكيف مع المريض
    """

    def __init__(self, min_db: float = -10, max_db: float = 120):
        self.core = GPCCore(min_db=min_db, max_db=max_db)
        self._last_heard: bool | None = None

    def calculate_next_db(self, current_db: float, heard: bool) -> float:
        next_db = self.core.calculate_next_db(current_db, heard, self._last_heard)
        self._last_heard = heard
        return next_db

    def is_threshold_reached(self, responses: list) -> float | None:
        return self.core.is_threshold_reached(responses)

    def get_limits(self) -> dict:
        return {
            'min_db': self.core.min_db,
            'max_db': self.core.max_db,
            'phase': self.core.phase,
            'reversals': self.core.reversals,
            'algorithm': 'GPC',
        }
