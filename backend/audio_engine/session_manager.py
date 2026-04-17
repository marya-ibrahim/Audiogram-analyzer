from .strategies.hughson_westlake import StrategyFactory


AIR_FREQUENCIES = [1000, 2000, 4000, 8000, 500, 250]
BONE_FREQUENCIES = [1000, 2000, 4000, 500, 250]


class HughsonWestlake:
    """محرك خوارزمية Hughson-Westlake لتردد واحد."""

    def __init__(self, strategy, start_db: float = 40.0):
        self.strategy = strategy
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
        has_hearing_loss: bool = False
    ):
        self.session_id = session_id
        self.ear = ear
        self.session_type = session_type
        self.has_hearing_loss = has_hearing_loss

        self.frequencies = (
            AIR_FREQUENCIES if session_type == 'air'
            else BONE_FREQUENCIES
        )

        self.current_freq_index = 0
        self.algorithms = {
            freq: HughsonWestlake(
                strategy=StrategyFactory.get_strategy(
                    session_type,
                    frequency=freq,
                    has_hearing_loss=has_hearing_loss
                ),
                start_db=30.0 if (session_type == 'bone' and has_hearing_loss) else 40.0
            )
            for freq in self.frequencies
        }
        self.completed_frequencies: list[dict] = []

    @property
    def current_frequency(self) -> int | None:
        if self.current_freq_index < len(self.frequencies):
            return self.frequencies[self.current_freq_index]
        return None

    def record_response(self, heard: bool) -> dict:
        freq = self.current_frequency
        if freq is None:
            return {'error': 'جميع الترددات مكتملة'}

        algo = self.algorithms[freq]
        result = algo.record_response(heard)

        if algo.is_complete:
            self.completed_frequencies.append({'frequency': freq, 'threshold': algo.threshold})
            self.current_freq_index += 1

        result['frequency'] = freq
        result['ear'] = self.ear
        result['session_type'] = self.session_type
        result['next_frequency'] = self.current_frequency
        result['session_complete'] = self.is_complete

        return result

    @property
    def is_complete(self) -> bool:
        return self.current_freq_index >= len(self.frequencies)

    def get_all_thresholds(self) -> dict:
        return {item['frequency']: item['threshold'] for item in self.completed_frequencies}