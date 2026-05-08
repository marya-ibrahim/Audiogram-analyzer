"""
Unit Tests — Core Business Logic
Tests: HughsonWestlakeStrategy, GPCCore, classify_hearing, classify_loss_type
"""
import pytest
from audio_engine.strategies.hughson_westlake import HughsonWestlakeStrategy, StrategyFactory
from audio_engine.classification import classify_hearing, classify_loss_type


# ── HughsonWestlakeStrategy ──────────────────────────────────────

class TestHughsonWestlake:

    def test_descend_on_heard(self):
        s = HughsonWestlakeStrategy(start_db=60)
        assert s.calculate_next_db(60, True) == 50

    def test_ascend_on_not_heard(self):
        s = HughsonWestlakeStrategy(start_db=60)
        assert s.calculate_next_db(60, False) == 65

    def test_min_db_boundary(self):
        s = HughsonWestlakeStrategy(min_db=-10, start_db=0)
        result = s.calculate_next_db(-10, True)
        assert result >= -10

    def test_max_db_boundary(self):
        s = HughsonWestlakeStrategy(max_db=120, start_db=110)
        result = s.calculate_next_db(120, False)
        assert result <= 120

    def test_threshold_after_two_heard(self):
        s = HughsonWestlakeStrategy(start_db=40)
        responses = [(40, True), (30, False), (35, True), (35, True)]
        threshold = s.is_threshold_reached(responses)
        assert threshold == 35.0

    def test_no_threshold_before_two_heard(self):
        s = HughsonWestlakeStrategy(start_db=40)
        responses = [(40, True), (30, False), (35, True)]
        assert s.is_threshold_reached(responses) is None

    def test_safety_after_20_responses(self):
        s = HughsonWestlakeStrategy(start_db=40)
        responses = [(40, True)] * 20
        threshold = s.is_threshold_reached(responses)
        assert threshold is not None

    def test_bone_max_db_respected(self):
        s = HughsonWestlakeStrategy(max_db=45, start_db=40, is_bone=True)
        result = s.calculate_next_db(45, False)
        assert result <= 45


# ── classify_hearing ─────────────────────────────────────────────

class TestClassifyHearing:

    def test_normal_hearing(self):
        result = classify_hearing({500: 10, 1000: 15, 2000: 10, 4000: 20})
        assert result['classification'] == 'Normal'

    def test_mild_loss(self):
        result = classify_hearing({500: 30, 1000: 35, 2000: 30, 4000: 35})
        assert result['classification'] == 'Mild'

    def test_moderate_loss(self):
        result = classify_hearing({500: 45, 1000: 50, 2000: 45, 4000: 50})
        assert result['classification'] == 'Moderate'

    def test_severe_loss(self):
        result = classify_hearing({500: 75, 1000: 80, 2000: 75, 4000: 80})
        assert result['classification'] == 'Severe'

    def test_profound_loss(self):
        result = classify_hearing({500: 95, 1000: 100, 2000: 95, 4000: 100})
        assert result['classification'] == 'Profound'

    def test_needs_bone_conduction_flag(self):
        result = classify_hearing({500: 30, 1000: 35, 2000: 30, 4000: 35})
        assert result['needs_bone_conduction'] is True

    def test_no_bone_needed_for_normal(self):
        result = classify_hearing({500: 10, 1000: 15, 2000: 10, 4000: 20})
        assert result['needs_bone_conduction'] is False

    def test_empty_thresholds_returns_error(self):
        result = classify_hearing({})
        assert 'error' in result

    def test_pta_calculation(self):
        result = classify_hearing({500: 40, 1000: 40, 2000: 40, 4000: 40})
        assert result['pta'] == 40.0


# ── classify_loss_type ───────────────────────────────────────────

class TestClassifyLossType:

    def test_conductive_loss(self):
        air = {500: 50, 1000: 55, 2000: 50}
        bone = {500: 10, 1000: 15, 2000: 10}
        result = classify_loss_type(air, bone)
        assert result['loss_type'] == 'Conductive'

    def test_sensorineural_loss(self):
        air = {500: 50, 1000: 55, 2000: 50}
        bone = {500: 45, 1000: 50, 2000: 45}
        result = classify_loss_type(air, bone)
        assert result['loss_type'] == 'Sensorineural'

    def test_mixed_loss(self):
        air = {500: 70, 1000: 75, 2000: 70}
        bone = {500: 40, 1000: 45, 2000: 40}
        result = classify_loss_type(air, bone)
        assert result['loss_type'] == 'Mixed'

    def test_no_common_freqs(self):
        result = classify_loss_type({500: 40}, {1000: 30})
        assert 'error' in result


# ── StrategyFactory ──────────────────────────────────────────────

class TestStrategyFactory:

    def test_creates_hw_for_air(self):
        s = StrategyFactory.get_strategy('air', 'hughson_westlake', 1000)
        assert isinstance(s, HughsonWestlakeStrategy)

    def test_creates_hw_for_bone(self):
        s = StrategyFactory.get_strategy('bone', 'hughson_westlake', 1000)
        assert isinstance(s, HughsonWestlakeStrategy)
        assert s.max_db == 70  # bone limit for 1000 Hz

    def test_bone_250_max_db(self):
        s = StrategyFactory.get_strategy('bone', 'hughson_westlake', 250)
        assert s.max_db == 45

    def test_invalid_algorithm_raises(self):
        with pytest.raises(ValueError):
            StrategyFactory.get_strategy('air', 'unknown_algo', 1000)
