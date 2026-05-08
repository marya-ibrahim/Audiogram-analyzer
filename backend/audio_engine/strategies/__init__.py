from .hughson_westlake import HughsonWestlakeStrategy
from .gpc_engine.gpc_strategy import GPCStrategy


class HearingContext:
    """
    Context responsible for selecting and switching hearing test algorithms.
    """
    
    def __init__(self, strategy_type: str = "traditional"):
        """
        Select algorithm based on type.
        
        Args:
            strategy_type: "traditional" for Hughson-Westlake or "gpc" for Gaussian Process
        """
        # Choose algorithm based on session type
        if strategy_type == "gpc":
            self.strategy = GPCStrategy()
        else:
            # Use the traditional algorithm from hughson_westlake
            self.strategy = HughsonWestlakeStrategy()
    
    def calculate_next_db(self, current_db: float, heard: bool) -> float:
        """Unified method called by the View or Manager to get the next dB level."""
        return self.strategy.calculate_next_db(current_db, heard)
    
    def is_threshold_reached(self, responses: list):
        """Check whether the algorithm has reached the final threshold."""
        return self.strategy.is_threshold_reached(responses)
    
    def get_limits(self) -> dict:
        """Get the dB limits (Min/Max) for the current strategy."""
        return self.strategy.get_limits()