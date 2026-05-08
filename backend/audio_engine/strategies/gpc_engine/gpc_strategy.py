from ..base import ThresholdStrategy
from .core import GPCCore


class GPCStrategy(ThresholdStrategy):
    """
    Real GPC strategy — inherits from ThresholdStrategy.
    Uses Gaussian Process Classification with Uncertainty Sampling.
    A separate GPCCore object per frequency (lazy init).
    """

    def __init__(
        self,
        min_db: float = -10,
        max_db: float = 120,
        current_frequency: float = 1000,
        start_db: float = 40.0,
    ):
        self.min_db            = min_db
        self.max_db            = max_db
        self.current_frequency = current_frequency
        self.start_db          = start_db

        # Separate GPCCore per frequency
        self._cores      : dict[float, GPCCore] = {}
        self._thresholds : dict[float, float]   = {}  # completed frequency thresholds

    # ── set_frequency called by SessionManager ────────────────────
    def set_frequency(self, frequency: float) -> None:
        self.current_frequency = frequency
        if frequency not in self._cores:
            # Smart prior: use average of previous thresholds as starting point
            prior_db = self._estimate_prior(frequency)
            self._cores[frequency] = GPCCore(
                min_db=self.min_db,
                max_db=self.max_db,
                start_db=prior_db,
            )

    def _estimate_prior(self, frequency: float) -> float:
        """Estimate starting point from previous thresholds."""
        if not self._thresholds:
            return self.start_db
        # Average of completed thresholds as prior for the new frequency
        return round(sum(self._thresholds.values()) / len(self._thresholds), 1)

    def record_threshold(self, frequency: float, threshold: float) -> None:
        """Called by SessionManager after each frequency completes."""
        self._thresholds[frequency] = threshold

    def _core(self) -> GPCCore:
        if self.current_frequency not in self._cores:
            self.set_frequency(self.current_frequency)
        return self._cores[self.current_frequency]

    # ── ThresholdStrategy interface ───────────────────────────────
    def calculate_next_db(self, current_db: float, heard: bool) -> float:
        return self._core().calculate_next_db(current_db, heard)

    def is_threshold_reached(self, responses: list) -> float | None:
        return self._core().is_threshold_reached(responses)

    def get_limits(self) -> dict:
        core = self._core()
        return {
            'start_db':   self.start_db,
            'min_db':     self.min_db,
            'max_db':     self.max_db,
            'step_down':  10,
            'step_up':    5,
            'phase':      core.phase,
            'reversals':  core.reversals,
            'confidence': core.get_confidence(),
            'frequency':  self.current_frequency,
            'algorithm':  'GPC-Adaptive',
        }
