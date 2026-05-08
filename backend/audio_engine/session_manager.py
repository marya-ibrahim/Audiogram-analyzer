from .strategies.hughson_westlake import StrategyFactory

AIR_FREQUENCIES  = [1000, 2000, 4000, 8000, 500, 250]
BONE_FREQUENCIES = [1000, 2000, 4000, 500, 250]


class HughsonWestlake:
    """Algorithm engine for a single frequency."""

    def __init__(self, strategy, start_db: float = 30.0):
        self.strategy   = strategy
        self.current_db = start_db
        self.responses: list[tuple[float, bool]] = []
        self.threshold: float | None = None

    @property
    def is_complete(self) -> bool:
        return self.threshold is not None

    def record_response(self, heard: bool) -> dict:
        self.responses.append((self.current_db, heard))
        threshold = self.strategy.is_threshold_reached(self.responses)

        if threshold is not None:
            self.threshold = threshold
            return {'is_complete': True, 'threshold': threshold, 'current_db': self.current_db}

        self.current_db = self.strategy.calculate_next_db(self.current_db, heard)
        return {'is_complete': False, 'current_db': self.current_db}


class SessionManager:
    def __init__(
        self,
        session_id: int,
        ear: str,
        session_type: str = 'air',
        algorithm: str = 'hughson_westlake',
        has_hearing_loss: bool = False,
    ):
        self.session_id       = session_id
        self.ear              = ear
        self.session_type     = session_type
        self.algorithm        = algorithm
        self.has_hearing_loss = has_hearing_loss

        self.frequencies = (
            AIR_FREQUENCIES if session_type == 'air'
            else BONE_FREQUENCIES
        )

        self.current_freq_index    = 0
        self.completed_frequencies: list[dict] = []

        # ── Starting point ────────────────────────────────────────
        if algorithm == 'gaussian_process':
            # GPC needs a high start (60 dB) to reach threshold quickly
            gpc_start = 60.0 if not has_hearing_loss else 80.0
            hw_start  = gpc_start
        else:
            # H-W starts at 30 per medical protocol
            hw_start = 30.0

        # ── Build algorithm instances per frequency ───────────────
        self.algorithms: dict[int, HughsonWestlake] = {}
        for freq in self.frequencies:
            strategy = StrategyFactory.get_strategy(
                session_type=session_type,
                algorithm=algorithm,
                frequency=freq,
                has_hearing_loss=has_hearing_loss,
            )
            if hasattr(strategy, 'set_frequency'):
                strategy.set_frequency(freq)

            self.algorithms[freq] = HughsonWestlake(
                strategy=strategy,
                start_db=hw_start,
            )

    @property
    def current_frequency(self) -> int | None:
        if self.current_freq_index < len(self.frequencies):
            return self.frequencies[self.current_freq_index]
        return None

    def record_response(self, heard: bool) -> dict:
        freq = self.current_frequency
        if freq is None:
            return {'error': 'All frequencies are complete'}

        algo   = self.algorithms[freq]
        result = algo.record_response(heard)

        if algo.is_complete:
            self.completed_frequencies.append({
                'frequency': freq,
                'threshold': algo.threshold,
            })
            # Notify the strategy of the completed threshold (important for GPC prior)
            if hasattr(algo.strategy, 'record_threshold'):
                algo.strategy.record_threshold(freq, algo.threshold)
            self.current_freq_index += 1

        result['frequency']        = freq
        result['ear']              = self.ear
        result['session_type']     = self.session_type
        result['algorithm']        = self.algorithm
        result['next_frequency']   = self.current_frequency
        result['session_complete'] = self.is_complete

        return result

    @property
    def is_complete(self) -> bool:
        return self.current_freq_index >= len(self.frequencies)

    def get_all_thresholds(self) -> dict:
        return {
            item['frequency']: item['threshold']
            for item in self.completed_frequencies
        }
