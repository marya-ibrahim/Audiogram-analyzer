"""
GPC Core — Real Gaussian Process Classification
====================================================
Uses scikit-learn to build a full probabilistic model over
(frequency × intensity) space and selects the next point via Uncertainty Sampling.

Reference: PMID 26258575 — Shen et al., Trends in Amplification (2015)

Required libraries:
    pip install scikit-learn numpy
"""

import numpy as np
from sklearn.gaussian_process import GaussianProcessClassifier
from sklearn.gaussian_process.kernels import (
    RBF, ConstantKernel, DotProduct, WhiteKernel
)

# ─── Search constants ────────────────────────────────────────────
_DB_MIN  = -10.0
_DB_MAX  = 120.0
_GRID_DB = 26    # number of dB grid points
_MIN_OBS = 4     # minimum observations before training GPC


# ─── Feature transformation functions ───────────────────────────
def _log_freq(hz: float) -> float:
    """
    Convert Hz to logarithmic octave scale (anchor: 125 Hz).
    The ear perceives frequencies on a log scale, not linear.
      250  Hz → 1.0
      1000 Hz → 3.0
      8000 Hz → 6.0
    """
    return np.log2(hz / 125.0)


def _feat(hz: float, db: float) -> np.ndarray:
    """Feature vector: [log_freq, dB_normalized]"""
    return np.array([_log_freq(hz), db / 100.0])


def _make_kernel():
    """
    Composite kernel for hearing modelling:
    • RBF(log_freq)     — hearing changes smoothly across octaves
    • DotProduct(dB)    — hearing probability increases linearly with intensity
    • WhiteKernel       — patient response noise
    """
    rbf    = ConstantKernel(1.0, (0.1, 10.0)) * RBF(1.2, (0.5, 3.0))
    linear = DotProduct(0.1, (1e-3, 1.0))
    noise  = WhiteKernel(0.1, (1e-4, 0.5))
    return rbf + linear + noise


# ─── GPCCore ────────────────────────────────────────────────────
class GPCCore:
    """
    Gaussian Process Classification engine for a single frequency.

    How it works:
    1. Collects all patient responses (dB, heard).
    2. After _MIN_OBS observations, trains GPC on all data.
    3. Builds a dense dB grid for the current frequency and computes P(heard|dB).
    4. Selects the next dB via Uncertainty Sampling:
         score(dB) = 1 − |P(heard) − 0.5| × 2
         → maximum score at P = 0.5 = theoretical threshold point.
    5. Threshold = the dB where P crosses 0.5.
    """

    def __init__(self, min_db: float = _DB_MIN, max_db: float = _DB_MAX, start_db: float = 60.0):
        self.min_db    = min_db
        self.max_db    = max_db
        self._start_db = start_db
        self._gpc      = GaussianProcessClassifier(
            kernel=_make_kernel(),
            n_restarts_optimizer=2,
            max_iter_predict=100,
            warm_start=True,
            random_state=42,
        )
        self._fitted   = False
        self._obs_db   : list[float] = []
        self._obs_rsp  : list[int]   = []

        # dB grid for search at this frequency
        self._db_grid  = np.linspace(min_db, max_db, _GRID_DB)

        # Backward compatibility
        self.phase      = 'gpc'
        self._reversals = 0

    # ── Main interface ───────────────────────────────────────────
    def calculate_next_db(
        self,
        current_db: float,
        heard: bool,
        last_heard: bool | None = None,
    ) -> float:
        """Record the response and compute the optimal next dB."""
        # 1. Record the observation (always — even at threshold)
        self._obs_db.append(current_db)
        self._obs_rsp.append(int(heard))

        # If at minimum and heard → threshold is the minimum directly
        if heard and current_db <= self.min_db:
            return self.min_db

        # If at maximum and not heard → threshold is the maximum directly
        if not heard and current_db >= self.max_db:
            return self.max_db

        # 2. Try to train GPC
        self._try_fit()

        # 3. Select the next dB
        if not self._fitted:
            return self._fallback(current_db, heard)
        return self._uncertainty_next(current_db)

    def is_threshold_reached(self, responses: list) -> float | None:
        """
        Threshold = the dB where P(heard) crosses 0.5 from below.
        Does not return threshold until model is trained and we have ≥ 6 observations.
        Hard cap: 10 attempts.
        """
        n = len(self._obs_rsp)

        # Check range boundaries
        if n >= 1:
            if all(r == 1 for r in self._obs_rsp) and self._obs_db[-1] <= self.min_db:
                return float(self.min_db)
            if all(r == 0 for r in self._obs_rsp) and self._obs_db[-1] >= self.max_db:
                return float(self.max_db)

        if n >= 10:
            if self._fitted:
                threshold = self._find_threshold()
                if threshold is not None:
                    return round(threshold, 1)
            # If all responses are in one direction
            if all(r == 1 for r in self._obs_rsp):
                return float(self.min_db)
            if all(r == 0 for r in self._obs_rsp):
                return float(self.max_db)
            # Best estimate from weighted average
            heard_dbs = [self._obs_db[i] for i, r in enumerate(self._obs_rsp) if r == 1]
            return round(min(heard_dbs), 1) if heard_dbs else float(self.max_db)

        if not self._fitted or n < 6:
            return None

        # Ensure we have both classes (heard and not heard)
        if len(set(self._obs_rsp)) < 2:
            return None

        # 50% rule: if the same level was heard once and not heard once → that is the threshold
        db_counts: dict[float, dict] = {}
        for db, rsp in zip(self._obs_db, self._obs_rsp):
            if db not in db_counts:
                db_counts[db] = {'heard': 0, 'total': 0}
            db_counts[db]['total'] += 1
            db_counts[db]['heard'] += rsp

        for db, counts in db_counts.items():
            if counts['total'] >= 2:
                ratio = counts['heard'] / counts['total']
                if 0.4 <= ratio <= 0.6:
                    return round(db, 1)

        threshold = self._find_threshold()
        if threshold is None:
            return None

        confidence = self._confidence_at(threshold)
        if confidence < 0.50:
            return None

        return round(threshold, 1)

    @property
    def reversals(self) -> int:
        return self._reversals

    def get_confidence(self) -> float:
        """Compute current confidence score for display in the UI."""
        if not self._fitted or len(self._obs_rsp) < 2:
            return 0.0
        threshold = self._find_threshold()
        if threshold is None:
            return 0.0
        return round(self._confidence_at(threshold), 2)

    # ── Internal helpers ─────────────────────────────────────────
    def _try_fit(self) -> None:
        """Train GPC if conditions are met."""
        if len(self._obs_rsp) < _MIN_OBS:
            return
        if len(set(self._obs_rsp)) < 2:
            return   # need both classes (0 and 1)
        try:
            X = np.array([[db / 100.0] for db in self._obs_db])
            y = np.array(self._obs_rsp, dtype=int)
            self._gpc.fit(X, y)
            self._fitted = True
        except Exception:
            self._fitted = False

    def _predict_grid(self) -> np.ndarray:
        """P(heard) for every point in the dB grid."""
        X = np.array([[db / 100.0] for db in self._db_grid])
        return self._gpc.predict_proba(X)[:, 1]

    def _uncertainty_next(self, current_db: float) -> float:
        """
        Uncertainty Sampling: choose the dB closest to P = 0.5.
        Penalizes points tested in the last 3 observations.
        """
        proba  = self._predict_grid()
        scores = 1.0 - np.abs(proba - 0.5) * 2.0   # peak at P=0.5

        # Penalize points near the last 3 observations
        for obs_db in self._obs_db[-3:]:
            for i, db in enumerate(self._db_grid):
                if abs(db - obs_db) < 8.0:
                    scores[i] *= 0.1

        best_db = float(self._db_grid[int(np.argmax(scores))])
        return round(max(self.min_db, min(self.max_db, best_db)), 1)

    def _find_threshold(self) -> float | None:
        """Find the dB where P(heard) crosses 0.5."""
        proba = self._predict_grid()
        for i in range(len(proba) - 1):
            if proba[i] < 0.5 <= proba[i + 1]:
                p0, p1 = proba[i], proba[i + 1]
                d0, d1 = self._db_grid[i], self._db_grid[i + 1]
                if abs(p1 - p0) < 1e-9:
                    return float(d0)
                return float(d0 + (0.5 - p0) / (p1 - p0) * (d1 - d0))
        if proba[-1] < 0.5:
            return float(self.max_db)
        if proba[0] >= 0.5:
            return float(self.min_db)
        return None

    def _confidence_at(self, threshold_db: float) -> float:
        """
        Model confidence = 1 − variance at the threshold point.
        Computed from the sharpness of the transition at P = 0.5.
        """
        proba = self._predict_grid()
        diffs = np.abs(np.diff(proba))
        sharpness = float(np.max(diffs)) if len(diffs) > 0 else 0.0
        return min(sharpness / 0.15, 1.0)

    def _fallback(self, current_db: float, heard: bool) -> float:
        """
        Before GPC is trained: simple staircase to get started quickly.
        Heard → descend 10 dB | Not heard → ascend 10 dB
        """
        next_db = current_db - 10.0 if heard else current_db + 10.0
        return float(max(self.min_db, min(self.max_db, next_db)))
