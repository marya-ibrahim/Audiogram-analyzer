from abc import ABC, abstractmethod
class ThresholdStrategy(ABC):
    @abstractmethod
    def calculate_next_db(self, current_db: float, heard: bool) -> float:
        pass

    @abstractmethod
    def is_threshold_reached(self, responses: list) -> float | None:
        pass

    @abstractmethod
    def get_limits(self) -> dict:
        pass