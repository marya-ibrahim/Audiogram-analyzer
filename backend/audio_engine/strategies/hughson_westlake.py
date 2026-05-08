from .base import ThresholdStrategy
from .gpc_engine.gpc_strategy import GPCStrategy


class HughsonWestlakeStrategy(ThresholdStrategy):
    """
    Traditional Hughson-Westlake algorithm.
    Supports both air conduction and bone conduction testing.
    """
    
    # Maximum dB per bone conduction frequency per medical standards
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
            min_db: Minimum dB level
            max_db: Maximum dB level
            frequency: Current test frequency
            is_bone: Whether this is a bone conduction test
            start_db: Starting level (manual override or via has_hearing_loss)
        """
        self.min_db = min_db
        self.max_db = max_db
        self.frequency = frequency
        self.is_bone = is_bone
        
        # Determine starting point if not provided manually
        if start_db is not None:
            self.start_db = start_db
        elif is_bone:
            # Bone conduction typically starts at 30 dB if hearing loss is suspected
            # Default value here; can be overridden by the Factory
            self.start_db = 30.0 
        else:
            self.start_db = -10.0

    def calculate_next_db(self, current_db: float, heard: bool) -> float:
        """
        Hughson-Westlake algorithm:
        - If heard: decrease by 10 dB
        - If not heard: increase by 5 dB
        """
        if heard:
            next_db = current_db - 10
        else:
            next_db = current_db + 5
        
        # Enforce dB limits
        return max(self.min_db, min(self.max_db, next_db))

    def is_threshold_reached(self, responses: list) -> float | None:
        """
        Determine threshold: heard at the same level twice (2 out of any presentations).
        Matches frontend logic.
        """
        heard_count = {}
        for db, heard in responses:
            if heard:
                heard_count[db] = heard_count.get(db, 0) + 1
                if heard_count[db] >= 2:
                    return float(db)

        # Safety: after 20 attempts take the lowest heard level
        if len(responses) >= 20:
            heard_levels = [db for db, heard in responses if heard]
            if heard_levels:
                return float(min(heard_levels))
            return float(responses[-1][0])

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
    Factory responsible for creating the appropriate strategy
    based on session type (air/bone) and requested algorithm.
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
            session_type: 'air' for air conduction, 'bone' for bone conduction
            algorithm: 'hughson_westlake' or 'gaussian_process'
            frequency: Frequency in Hz
            has_hearing_loss: If True, algorithm starts at higher levels (30 dB)
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
            raise ValueError(f"Unsupported algorithm: {algorithm}")

    @staticmethod
    def _get_hw_strategy(session_type: str, frequency: int, 
                         has_hearing_loss: bool) -> ThresholdStrategy:
        """Configure Hughson-Westlake strategy."""
        
        if session_type == 'air':
            # Air conduction: wide range -10 to 120
            return HughsonWestlakeStrategy(
                min_db=-10,
                max_db=120,
                frequency=frequency,
                is_bone=False,
                start_db=30.0 if has_hearing_loss else -10.0
            )
        
        elif session_type == 'bone':
            # Bone conduction: different limits per frequency
            if frequency is None:
                raise ValueError('Frequency must be specified for bone conduction test')
            
            max_db = HughsonWestlakeStrategy.BONE_MAX_DB_PER_FREQ.get(frequency, 70)
            return HughsonWestlakeStrategy(
                min_db=-10,
                max_db=max_db,
                frequency=frequency,
                is_bone=True,
                start_db=30.0 if has_hearing_loss else 0.0  # bone typically starts at 0 or 30
            )
        
        else:
            raise ValueError(f"Unknown session type: {session_type}")

    @staticmethod
    def _get_gpc_strategy(session_type: str, frequency: int,
                          has_hearing_loss: bool) -> GPCStrategy:
        """Configure Gaussian Process strategy."""
        
        start_db = 30.0 if has_hearing_loss else -10.0
        
        # Initialize the strategy
        strategy = GPCStrategy(
            current_frequency=frequency or 1000,
            start_db=start_db
        )
        
        if frequency:
            strategy.set_frequency(frequency)
        
        return strategy